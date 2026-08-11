import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const quoteInclude = Prisma.validator<Prisma.QuoteInclude>()({
  customer: true,
  lines: { include: { product: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
});
export type QuoteWithRelations = Prisma.QuoteGetPayload<{ include: typeof quoteInclude }>;

@Injectable()
export class QuotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.QuoteWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<QuoteWithRelations[]> {
    return this.prisma.quote.findMany({ where, skip, take, include: quoteInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.QuoteWhereInput): Promise<number> {
    return this.prisma.quote.count({ where });
  }

  findById(id: string, companyId: string): Promise<QuoteWithRelations | null> {
    return this.prisma.quote.findFirst({ where: { id, companyId }, include: quoteInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.quote.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(data: Prisma.QuoteCreateInput): Promise<QuoteWithRelations> {
    return this.prisma.quote.create({ data, include: quoteInclude });
  }

  update(id: string, data: Prisma.QuoteUpdateInput): Promise<QuoteWithRelations> {
    return this.prisma.quote.update({ where: { id }, data, include: quoteInclude });
  }

  /** Remplace intégralement les lignes d'un devis (delete-then-create, dans une transaction). */
  async replaceLines(id: string, lines: Prisma.QuoteLineCreateManyQuoteInput[]): Promise<QuoteWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      await tx.quoteLine.deleteMany({ where: { quoteId: id } });
      await tx.quoteLine.createMany({ data: lines.map((l) => ({ ...l, quoteId: id })) });
      return tx.quote.update({ where: { id }, data: {}, include: quoteInclude });
    });
  }
}

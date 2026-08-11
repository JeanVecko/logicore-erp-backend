import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const invoiceInclude = Prisma.validator<Prisma.InvoiceInclude>()({
  customer: true,
  sale: { include: { lines: { include: { product: true } } } },
  payments: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
});
export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

type PrismaLike = Pick<PrismaService, 'invoice'>;

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.InvoiceWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<InvoiceWithRelations[]> {
    return this.prisma.invoice.findMany({ where, skip, take, include: invoiceInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.InvoiceWhereInput): Promise<number> {
    return this.prisma.invoice.count({ where });
  }

  findById(id: string, companyId: string): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findFirst({ where: { id, companyId }, include: invoiceInclude });
  }

  /** Lecture "brute" (sans include) dans une transaction — utilisé par PaymentsService pour lire amountPaid/totalAmount de façon fraîche. */
  findByIdInTx(client: PrismaLike, id: string, companyId: string) {
    return client.invoice.findFirst({ where: { id, companyId } });
  }

  updateInTx(client: PrismaLike, id: string, data: Prisma.InvoiceUpdateInput) {
    return client.invoice.update({ where: { id }, data });
  }

  findBySaleId(saleId: string): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findUnique({ where: { saleId }, include: invoiceInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.invoice.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(data: Prisma.InvoiceCreateInput): Promise<InvoiceWithRelations> {
    return this.prisma.invoice.create({ data, include: invoiceInclude });
  }

  update(id: string, data: Prisma.InvoiceUpdateInput): Promise<InvoiceWithRelations> {
    return this.prisma.invoice.update({ where: { id }, data, include: invoiceInclude });
  }
}

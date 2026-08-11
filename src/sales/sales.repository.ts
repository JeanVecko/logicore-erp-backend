import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const saleInclude = Prisma.validator<Prisma.SaleInclude>()({
  customer: true,
  warehouse: true,
  lines: { include: { product: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
});
export type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

type PrismaLike = Pick<PrismaService, 'sale'>;

@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.SaleWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<SaleWithRelations[]> {
    return this.prisma.sale.findMany({ where, skip, take, include: saleInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.SaleWhereInput): Promise<number> {
    return this.prisma.sale.count({ where });
  }

  findById(id: string, companyId: string): Promise<SaleWithRelations | null> {
    return this.prisma.sale.findFirst({ where: { id, companyId }, include: saleInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.sale.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(data: Prisma.SaleCreateInput): Promise<SaleWithRelations> {
    return this.prisma.sale.create({ data, include: saleInclude });
  }

  update(id: string, data: Prisma.SaleUpdateInput): Promise<SaleWithRelations> {
    return this.prisma.sale.update({ where: { id }, data, include: saleInclude });
  }

  updateInTx(client: PrismaLike, id: string, data: Prisma.SaleUpdateInput) {
    return client.sale.update({ where: { id }, data });
  }
}

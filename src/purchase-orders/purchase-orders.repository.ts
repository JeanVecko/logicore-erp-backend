import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const poInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  warehouse: true,
  supplier: true,
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  lines: { include: { product: true } },
});
export type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof poInclude }>;

type PrismaLike = Pick<PrismaService, 'purchaseOrder'>;

@Injectable()
export class PurchaseOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.PurchaseOrderWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<PurchaseOrderWithRelations[]> {
    return this.prisma.purchaseOrder.findMany({ where, skip, take, include: poInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.PurchaseOrderWhereInput): Promise<number> {
    return this.prisma.purchaseOrder.count({ where });
  }

  findById(id: string, companyId: string): Promise<PurchaseOrderWithRelations | null> {
    return this.prisma.purchaseOrder.findFirst({ where: { id, companyId }, include: poInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.purchaseOrder.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(client: PrismaLike, data: Prisma.PurchaseOrderCreateInput): Promise<PurchaseOrderWithRelations> {
    return client.purchaseOrder.create({ data, include: poInclude });
  }

  markReceived(id: string): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'RECEIVED', receivedAt: new Date() },
      include: poInclude,
    });
  }

  update(id: string, data: Prisma.PurchaseOrderUpdateInput): Promise<PurchaseOrderWithRelations> {
    return this.prisma.purchaseOrder.update({ where: { id }, data, include: poInclude });
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const movementInclude = Prisma.validator<Prisma.StockMovementInclude>()({
  product: true,
  warehouse: true,
  targetWarehouse: true,
  performedBy: { select: { id: true, firstName: true, lastName: true } },
});
export type StockMovementWithRelations = Prisma.StockMovementGetPayload<{ include: typeof movementInclude }>;

type PrismaLike = Pick<PrismaService, 'stockMovement'>;

@Injectable()
export class StockMovementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.StockMovementWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<StockMovementWithRelations[]> {
    return this.prisma.stockMovement.findMany({ where, skip, take, include: movementInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.StockMovementWhereInput): Promise<number> {
    return this.prisma.stockMovement.count({ where });
  }

  findById(id: string, companyId: string): Promise<StockMovementWithRelations | null> {
    return this.prisma.stockMovement.findFirst({ where: { id, companyId }, include: movementInclude });
  }

  create(client: PrismaLike, data: Prisma.StockMovementCreateInput): Promise<StockMovementWithRelations> {
    return client.stockMovement.create({ data, include: movementInclude });
  }

  update(client: PrismaLike, id: string, data: Prisma.StockMovementUpdateInput): Promise<StockMovementWithRelations> {
    return client.stockMovement.update({ where: { id }, data, include: movementInclude });
  }

  delete(client: PrismaLike, id: string): Promise<StockMovementWithRelations> {
    return client.stockMovement.delete({ where: { id }, include: movementInclude });
  }
}

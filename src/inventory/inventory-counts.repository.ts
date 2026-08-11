import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const countInclude = Prisma.validator<Prisma.InventoryCountInclude>()({
  lines: { include: { product: true, warehouse: true } },
});
export type InventoryCountWithLines = Prisma.InventoryCountGetPayload<{ include: typeof countInclude }>;

@Injectable()
export class InventoryCountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    companyId: string,
    skip = 0,
    take = 20,
    sortDir: 'asc' | 'desc' = 'desc',
  ): Promise<Prisma.InventoryCountGetPayload<{ include: { lines: false } }>[]> {
    return this.prisma.inventoryCount.findMany({
      where: { companyId },
      skip,
      take,
      orderBy: { generatedAt: sortDir },
    });
  }

  count(companyId: string): Promise<number> {
    return this.prisma.inventoryCount.count({ where: { companyId } });
  }

  findByPeriod(companyId: string, periodKey: string): Promise<InventoryCountWithLines | null> {
    return this.prisma.inventoryCount.findUnique({
      where: { companyId_periodKey: { companyId, periodKey } },
      include: countInclude,
    });
  }

  findById(id: string, companyId: string): Promise<InventoryCountWithLines | null> {
    return this.prisma.inventoryCount.findFirst({ where: { id, companyId }, include: countInclude });
  }

  create(data: Prisma.InventoryCountCreateInput): Promise<InventoryCountWithLines> {
    return this.prisma.inventoryCount.create({ data, include: countInclude });
  }
}

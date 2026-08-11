import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const inventoryInclude = Prisma.validator<Prisma.InventoryInclude>()({
  product: { include: { category: true } },
  warehouse: true,
});
export type InventoryWithRelations = Prisma.InventoryGetPayload<{ include: typeof inventoryInclude }>;

/** Client Prisma générique (PrismaService ou une transaction interactive `tx`). */
type PrismaLike = Pick<PrismaService, 'inventory'>;

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.InventoryWhereInput, skip = 0, take = 20): Promise<InventoryWithRelations[]> {
    return this.prisma.inventory.findMany({
      where,
      skip,
      take,
      include: inventoryInclude,
      orderBy: { product: { name: 'asc' } },
    });
  }

  count(where: Prisma.InventoryWhereInput): Promise<number> {
    return this.prisma.inventory.count({ where });
  }

  findAllForAlerts(companyId: string): Promise<InventoryWithRelations[]> {
    return this.prisma.inventory.findMany({
      where: { companyId, product: { isActive: true } },
      include: inventoryInclude,
      orderBy: { quantity: 'asc' },
    });
  }

  findOne(productId: string, warehouseId: string): Promise<InventoryWithRelations | null> {
    return this.prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
      include: inventoryInclude,
    });
  }

  /**
   * Applique un delta signé au stock (productId, warehouseId), en le créant si besoin.
   * `client` permet de passer le client d'une transaction Prisma interactive pour rester
   * atomique avec la création du StockMovement associé.
   */
  async applyDelta(
    client: PrismaLike,
    companyId: string,
    productId: string,
    warehouseId: string,
    delta: number,
  ): Promise<{ quantity: number }> {
    const existing = await client.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!existing) {
      return client.inventory.create({
        data: { companyId, productId, warehouseId, quantity: delta },
      });
    }

    return client.inventory.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantity: existing.quantity + delta },
    });
  }

  async getQuantity(client: PrismaLike, productId: string, warehouseId: string): Promise<number> {
    const existing = await client.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
    return existing?.quantity ?? 0;
  }
}

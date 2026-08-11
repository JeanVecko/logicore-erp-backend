import { Injectable } from '@nestjs/common';
import { InventoryRepository, InventoryWithRelations } from './inventory.repository';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

export type StockStatus = 'ok' | 'bas' | 'rupture';

/** Sous ce ratio du seuil de réappro, le stock est considéré critique (rupture). */
const CRITICAL_RATIO = 0.3;

export function resolveStockStatus(quantity: number, reorderPoint: number): StockStatus {
  if (reorderPoint <= 0) return quantity > 0 ? 'ok' : 'rupture';
  if (quantity <= reorderPoint * CRITICAL_RATIO) return 'rupture';
  if (quantity <= reorderPoint) return 'bas';
  return 'ok';
}

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async findAll(companyId: string, query: QueryInventoryDto): Promise<PaginatedResult<InventoryWithRelations & { status: StockStatus }>> {
    const where = {
      companyId,
      product: { isActive: true },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    const withStatus = items.map((i) => ({ ...i, status: resolveStockStatus(i.quantity, i.product.reorderPoint) }));
    return buildPaginatedResult(withStatus, totalItems, query.page, query.limit);
  }

  async getAlerts(companyId: string): Promise<Array<InventoryWithRelations & { status: StockStatus }>> {
    const all = await this.repository.findAllForAlerts(companyId);
    return all
      .map((i) => ({ ...i, status: resolveStockStatus(i.quantity, i.product.reorderPoint) }))
      .filter((i) => i.status !== 'ok')
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'rupture' ? -1 : 1));
  }
}

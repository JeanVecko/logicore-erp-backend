import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesRepository, SaleWithRelations } from './sales.repository';
import { CustomersService } from '../customers/customers.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductsService } from '../products/products.service';
import { InventoryRepository } from '../inventory/inventory.repository';
import { StockMovementsRepository } from '../stock-movements/stock-movements.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveStockStatus } from '../inventory/inventory.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SalesRepository,
    private readonly customersService: CustomersService,
    private readonly warehousesService: WarehousesService,
    private readonly productsService: ProductsService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(companyId: string, query: QuerySalesDto): Promise<PaginatedResult<SaleWithRelations>> {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? { ref: { contains: query.search } } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<SaleWithRelations> {
    const sale = await this.repository.findById(id, companyId);
    if (!sale) throw new NotFoundException('Vente introuvable');
    return sale;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `VTE-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateSaleDto): Promise<SaleWithRelations> {
    if (dto.customerId) await this.customersService.findById(dto.customerId, companyId);
    await this.warehousesService.findById(dto.warehouseId, companyId);
    for (const line of dto.lines) {
      await this.productsService.findById(line.productId, companyId);
    }

    const ref = await this.generateRef(companyId);
    const totalAmount = dto.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice - (l.discount ?? 0), 0);

    return this.repository.create({
      company: { connect: { id: companyId } },
      ...(dto.customerId ? { customer: { connect: { id: dto.customerId } } } : {}),
      customerName: dto.customerName,
      warehouse: { connect: { id: dto.warehouseId } },
      ref,
      status: 'DRAFT',
      totalAmount,
      notes: dto.notes,
      ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
      lines: {
        create: dto.lines.map((l) => ({
          product: { connect: { id: l.productId } },
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount ?? 0,
        })),
      },
    });
  }

  /**
   * Valide une vente : génère les mouvements de stock EXIT et décrémente le stock, ligne par ligne.
   * Tout se passe dans UNE SEULE transaction Prisma (contrairement à PurchaseOrdersService.receive()
   * qui boucle sur StockMovementsService.create() — chaque appel y ouvre sa propre transaction, donc
   * n'est pas atomique entre lignes). Ici, une ligne en échec (stock insuffisant) annule tout :
   * aucune ligne n'est partiellement appliquée.
   */
  async validate(id: string, companyId: string, userId: string): Promise<SaleWithRelations> {
    const sale = await this.findById(id, companyId);
    if (sale.status !== 'DRAFT') {
      throw new ConflictException('Seule une vente en brouillon peut être validée.');
    }

    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    const beforeByProduct = new Map<string, number>();

    await this.prisma.$transaction(async (tx) => {
      for (const line of sale.lines) {
        const current = await this.inventoryRepository.getQuantity(tx, line.productId, sale.warehouseId);
        beforeByProduct.set(line.productId, current);

        if (!company.allowNegativeStock && current < line.quantity) {
          throw new ConflictException(
            `Stock insuffisant pour ${line.product.name} (${line.product.sku}) : ${current} disponible(s), ${line.quantity} demandé(s).`,
          );
        }

        await this.inventoryRepository.applyDelta(tx, companyId, line.productId, sale.warehouseId, -line.quantity);
        await this.stockMovementsRepository.create(tx, {
          company: { connect: { id: companyId } },
          product: { connect: { id: line.productId } },
          warehouse: { connect: { id: sale.warehouseId } },
          type: 'EXIT',
          quantity: -line.quantity,
          reference: sale.ref,
          notes: `Vente ${sale.ref}`,
          ...(userId ? { performedBy: { connect: { id: userId } } } : {}),
        });
      }

      await this.repository.updateInTx(tx, id, {
        status: 'VALIDATED',
        validatedBy: { connect: { id: userId } },
        validatedAt: new Date(),
      });
    });

    for (const line of sale.lines) {
      const before = beforeByProduct.get(line.productId) ?? 0;
      const after = before - line.quantity;
      const beforeStatus = resolveStockStatus(before, line.product.reorderPoint);
      const afterStatus = resolveStockStatus(after, line.product.reorderPoint);
      if (beforeStatus !== 'rupture' && afterStatus === 'rupture') {
        await this.notificationsService.notifyCompany(
          companyId,
          'STOCK_ALERT',
          'Rupture de stock',
          `${line.product.name} (${line.product.sku}) est passé en rupture de stock suite à la vente ${sale.ref}.`,
          '/inventory/alerts',
        );
      }
    }

    return this.findById(id, companyId);
  }

  /** Uniquement pour une vente DRAFT — annuler une vente déjà validée (avec réversion de stock) n'est pas pris en charge dans cette version. */
  async cancel(id: string, companyId: string): Promise<SaleWithRelations> {
    const sale = await this.findById(id, companyId);
    if (sale.status !== 'DRAFT') {
      throw new ConflictException('Seule une vente en brouillon peut être annulée.');
    }
    return this.repository.update(id, { status: 'CANCELLED' });
  }
}

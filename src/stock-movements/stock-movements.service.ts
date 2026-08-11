import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsRepository, StockMovementWithRelations } from './stock-movements.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { resolveStockStatus } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StockMovementsRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly productsService: ProductsService,
    private readonly warehousesService: WarehousesService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string, query: QueryStockMovementsDto): Promise<PaginatedResult<StockMovementWithRelations>> {
    const where = {
      companyId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search } },
              { product: { name: { contains: query.search } } },
              { product: { sku: { contains: query.search } } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<StockMovementWithRelations> {
    const movement = await this.repository.findById(id, companyId);
    if (!movement) throw new NotFoundException('Mouvement introuvable');
    return movement;
  }

  async create(companyId: string, userId: string, dto: CreateStockMovementDto): Promise<StockMovementWithRelations> {
    const product = await this.productsService.findById(dto.productId, companyId);
    await this.warehousesService.findById(dto.warehouseId, companyId);

    if (dto.type === 'TRANSFER') {
      if (!dto.targetWarehouseId) {
        throw new BadRequestException('targetWarehouseId est requis pour un transfert');
      }
      if (dto.targetWarehouseId === dto.warehouseId) {
        throw new BadRequestException('Le dépôt de destination doit être différent du dépôt source');
      }
      await this.warehousesService.findById(dto.targetWarehouseId, companyId);
    }

    if (['ENTRY', 'EXIT', 'TRANSFER'].includes(dto.type) && dto.quantity <= 0) {
      throw new BadRequestException('La quantité doit être strictement positive pour ce type de mouvement');
    }
    if (dto.type === 'ADJUSTMENT' && dto.quantity === 0) {
      throw new BadRequestException("La quantité d'ajustement ne peut pas être nulle");
    }

    const signedDelta = dto.type === 'EXIT' || dto.type === 'TRANSFER' ? -dto.quantity : dto.quantity;
    const isDecrease = signedDelta < 0;
    const decreaseAmount = Math.abs(signedDelta);

    const movement = await this.prisma.$transaction(async (tx) => {
      const before = await this.inventoryRepository.getQuantity(tx, dto.productId, dto.warehouseId);

      if (isDecrease && before < decreaseAmount) {
        throw new ConflictException(
          `Stock insuffisant sur ce dépôt : ${before} disponible(s), ${decreaseAmount} demandé(s)`,
        );
      }

      await this.inventoryRepository.applyDelta(tx, companyId, dto.productId, dto.warehouseId, signedDelta);

      if (dto.type === 'TRANSFER' && dto.targetWarehouseId) {
        await this.inventoryRepository.applyDelta(tx, companyId, dto.productId, dto.targetWarehouseId, dto.quantity);
      }

      const created = await this.repository.create(tx, {
        company: { connect: { id: companyId } },
        product: { connect: { id: dto.productId } },
        warehouse: { connect: { id: dto.warehouseId } },
        ...(dto.targetWarehouseId ? { targetWarehouse: { connect: { id: dto.targetWarehouseId } } } : {}),
        type: dto.type,
        quantity: signedDelta,
        reference: dto.reference,
        notes: dto.notes,
        ...(userId ? { performedBy: { connect: { id: userId } } } : {}),
      });

      const beforeStatus = resolveStockStatus(before, product.reorderPoint);
      const afterStatus = resolveStockStatus(before + signedDelta, product.reorderPoint);

      return { created, crossedIntoRupture: beforeStatus !== 'rupture' && afterStatus === 'rupture' };
    });

    if (movement.crossedIntoRupture) {
      await this.notificationsService.notifyCompany(
        companyId,
        'STOCK_ALERT',
        'Rupture de stock',
        `${product.name} (${product.sku}) est passé en rupture de stock.`,
        '/inventory/alerts',
      );
    }

    return movement.created;
  }

  /** Retire l'effet d'un mouvement existant du stock courant, en refusant si ça ferait passer un solde sous zéro. */
  private async reverseEffect(
    tx: TxClient,
    companyId: string,
    movement: Pick<StockMovementWithRelations, 'productId' | 'warehouseId' | 'targetWarehouseId' | 'type' | 'quantity'>,
  ): Promise<void> {
    const reverseSourceDelta = -movement.quantity;
    if (reverseSourceDelta < 0) {
      const current = await this.inventoryRepository.getQuantity(tx, movement.productId, movement.warehouseId);
      if (current < Math.abs(reverseSourceDelta)) {
        throw new ConflictException(
          `Impossible d'annuler ce mouvement : stock insuffisant sur le dépôt source (${current} disponible(s)).`,
        );
      }
    }
    await this.inventoryRepository.applyDelta(tx, companyId, movement.productId, movement.warehouseId, reverseSourceDelta);

    if (movement.type === 'TRANSFER' && movement.targetWarehouseId) {
      const reverseTargetDelta = -Math.abs(movement.quantity);
      const currentTarget = await this.inventoryRepository.getQuantity(tx, movement.productId, movement.targetWarehouseId);
      if (currentTarget < Math.abs(reverseTargetDelta)) {
        throw new ConflictException(
          `Impossible d'annuler ce transfert : stock insuffisant sur le dépôt de destination (${currentTarget} disponible(s)).`,
        );
      }
      await this.inventoryRepository.applyDelta(tx, companyId, movement.productId, movement.targetWarehouseId, reverseTargetDelta);
    }
  }

  /**
   * Correction d'un mouvement — réservée au Super Admin (contrôlé au niveau du controller).
   * Annule l'effet du mouvement existant puis réapplique le nouveau, dans la même transaction.
   * L'article, le dépôt source et le dépôt cible ne sont volontairement pas modifiables ici.
   */
  async update(companyId: string, userId: string, id: string, dto: UpdateStockMovementDto): Promise<StockMovementWithRelations> {
    const existing = await this.findById(id, companyId);

    if (dto.type && (dto.type === 'TRANSFER') !== (existing.type === 'TRANSFER')) {
      throw new BadRequestException(
        "Impossible de convertir un transfert vers un autre type de mouvement (ou inversement) — supprimez ce mouvement et recréez-en un.",
      );
    }

    const effectiveType = dto.type ?? existing.type;
    const currentInputQuantity = existing.type === 'EXIT' || existing.type === 'TRANSFER' ? -existing.quantity : existing.quantity;
    const effectiveInputQuantity = dto.quantity ?? currentInputQuantity;

    if (['ENTRY', 'EXIT', 'TRANSFER'].includes(effectiveType) && effectiveInputQuantity <= 0) {
      throw new BadRequestException('La quantité doit être strictement positive pour ce type de mouvement');
    }
    if (effectiveType === 'ADJUSTMENT' && effectiveInputQuantity === 0) {
      throw new BadRequestException("La quantité d'ajustement ne peut pas être nulle");
    }

    const newSignedDelta = effectiveType === 'EXIT' || effectiveType === 'TRANSFER' ? -effectiveInputQuantity : effectiveInputQuantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.reverseEffect(tx, companyId, existing);

      if (newSignedDelta < 0) {
        const current = await this.inventoryRepository.getQuantity(tx, existing.productId, existing.warehouseId);
        if (current < Math.abs(newSignedDelta)) {
          throw new ConflictException(
            `Stock insuffisant après correction : ${current} disponible(s), ${Math.abs(newSignedDelta)} demandé(s)`,
          );
        }
      }
      await this.inventoryRepository.applyDelta(tx, companyId, existing.productId, existing.warehouseId, newSignedDelta);
      if (effectiveType === 'TRANSFER' && existing.targetWarehouseId) {
        await this.inventoryRepository.applyDelta(tx, companyId, existing.productId, existing.targetWarehouseId, Math.abs(newSignedDelta));
      }

      return this.repository.update(tx, id, {
        type: effectiveType,
        quantity: newSignedDelta,
        ...(dto.reference !== undefined ? { reference: dto.reference } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      });
    });

    await this.auditService.record({
      companyId,
      userId,
      action: 'STOCK_MOVEMENT_UPDATED',
      entity: 'StockMovement',
      entityId: id,
      metadata: {
        before: { type: existing.type, quantity: existing.quantity },
        after: { type: effectiveType, quantity: newSignedDelta },
      },
    });

    return updated;
  }

  /** Suppression — réservée au Super Admin. Annule l'effet du mouvement sur le stock avant de le retirer du journal. */
  async remove(companyId: string, userId: string, id: string): Promise<{ id: string }> {
    const existing = await this.findById(id, companyId);

    await this.prisma.$transaction(async (tx) => {
      await this.reverseEffect(tx, companyId, existing);
      await this.repository.delete(tx, id);
    });

    await this.auditService.record({
      companyId,
      userId,
      action: 'STOCK_MOVEMENT_DELETED',
      entity: 'StockMovement',
      entityId: id,
      metadata: {
        type: existing.type,
        quantity: existing.quantity,
        productId: existing.productId,
        warehouseId: existing.warehouseId,
        reference: existing.reference,
      },
    });

    return { id };
  }
}

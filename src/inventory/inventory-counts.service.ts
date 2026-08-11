import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryCountsRepository, InventoryCountWithLines } from './inventory-counts.repository';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const MONTH_LABELS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

type TriggerSource = 'AUTO' | 'MANUAL';

@Injectable()
export class InventoryCountsService {
  private readonly logger = new Logger(InventoryCountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: InventoryCountsRepository,
  ) {}

  async findAll(companyId: string, query: PaginationQueryDto): Promise<PaginatedResult<unknown>> {
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(companyId, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(companyId),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<InventoryCountWithLines> {
    const count = await this.repository.findById(id, companyId);
    if (!count) throw new NotFoundException('Relevé d\'inventaire introuvable');
    return count;
  }

  /**
   * Génère le relevé du mois courant. Idempotent : un seul relevé par entreprise et par mois
   * (contrainte @@unique en base). Le stock initial est reconstitué en "rejouant" à l'envers
   * tous les mouvements du mois (y compris les deux effets d'un transfert), pas stocké à part —
   * il n'y a donc rien à corrompre ni à resynchroniser.
   */
  async generate(companyId: string, triggeredBy: TriggerSource): Promise<InventoryCountWithLines> {
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const existing = await this.repository.findByPeriod(companyId, periodKey);
    if (existing) {
      if (triggeredBy === 'AUTO') return existing;
      throw new ConflictException(`Un relevé d'inventaire existe déjà pour cette période (${existing.ref}).`);
    }

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [inventories, movements] = await Promise.all([
      this.prisma.inventory.findMany({ where: { companyId } }),
      this.prisma.stockMovement.findMany({
        where: { companyId, createdAt: { gte: startOfMonth } },
        select: { productId: true, warehouseId: true, targetWarehouseId: true, type: true, quantity: true },
      }),
    ]);

    const deltaByKey = new Map<string, number>();
    const addDelta = (productId: string, warehouseId: string, delta: number) => {
      const key = `${productId}:${warehouseId}`;
      deltaByKey.set(key, (deltaByKey.get(key) ?? 0) + delta);
    };
    for (const m of movements) {
      addDelta(m.productId, m.warehouseId, m.quantity);
      if (m.type === 'TRANSFER' && m.targetWarehouseId) {
        addDelta(m.productId, m.targetWarehouseId, Math.abs(m.quantity));
      }
    }

    const periodLabel = `${MONTH_LABELS_FR[now.getMonth()]} ${now.getFullYear()}`;
    const ref = `INV-${periodKey}`;

    return this.repository.create({
      company: { connect: { id: companyId } },
      ref,
      periodKey,
      periodLabel,
      triggeredBy,
      lines: {
        create: inventories.map((inv) => {
          const delta = deltaByKey.get(`${inv.productId}:${inv.warehouseId}`) ?? 0;
          return {
            product: { connect: { id: inv.productId } },
            warehouse: { connect: { id: inv.warehouseId } },
            openingStock: inv.quantity - delta,
            currentStock: inv.quantity,
          };
        }),
      },
    });
  }

  /** Appelée par la tâche planifiée : génère pour toutes les entreprises actives, sans jamais interrompre les autres en cas d'échec isolé. */
  async generateForAllCompanies(): Promise<InventoryCountWithLines[]> {
    const companies = await this.prisma.company.findMany({ where: { isActive: true }, select: { id: true } });
    const results: InventoryCountWithLines[] = [];
    for (const company of companies) {
      try {
        results.push(await this.generate(company.id, 'AUTO'));
      } catch (err) {
        this.logger.error(`Échec de génération du relevé pour l'entreprise ${company.id} : ${(err as Error).message}`);
      }
    }
    return results;
  }
}

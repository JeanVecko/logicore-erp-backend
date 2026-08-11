import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService, resolveStockStatus } from '../inventory/inventory.service';

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRY: 'a enregistré une entrée de stock',
  EXIT: 'a enregistré une sortie de stock',
  TRANSFER: 'a effectué un transfert de stock',
  ADJUSTMENT: 'a ajusté le stock',
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async getSummary(companyId: string) {
    const [kpis, movements, alerts, activity] = await Promise.all([
      this.getKpis(companyId),
      this.getMovements(companyId),
      this.inventoryService.getAlerts(companyId),
      this.getActivity(companyId),
    ]);
    return { kpis, movements, alerts, activity };
  }

  private async getKpis(companyId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { companyId, product: { isActive: true } },
      include: { product: true },
    });

    const stockValue = inventories.reduce((sum, i) => sum + i.quantity * i.product.purchasePrice, 0);
    const articlesRupture = inventories.filter(
      (i) => resolveStockStatus(i.quantity, i.product.reorderPoint) === 'rupture',
    ).length;

    const commandesEnAttente = await this.prisma.purchaseOrder.count({ where: { companyId, status: 'ISSUED' } });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const exitMovements = await this.prisma.stockMovement.findMany({
      where: { companyId, type: 'EXIT', createdAt: { gte: thirtyDaysAgo } },
      select: { quantity: true },
    });
    const totalExits = exitMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const avgStock = inventories.length > 0 ? inventories.reduce((s, i) => s + i.quantity, 0) / inventories.length : 0;
    const tauxRotation = avgStock > 0 ? Number((totalExits / avgStock).toFixed(1)) : 0;

    return { stockValue, articlesRupture, commandesEnAttente, tauxRotation };
  }

  private async getMovements(companyId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const movements = await this.prisma.stockMovement.findMany({
      where: { companyId, createdAt: { gte: since }, type: { in: ['ENTRY', 'EXIT'] } },
      select: { type: true, quantity: true, createdAt: true },
    });

    const days: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    return days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayMovements = movements.filter((m) => m.createdAt >= day && m.createdAt < next);
      const entrees = dayMovements.filter((m) => m.type === 'ENTRY').reduce((s, m) => s + m.quantity, 0);
      const sorties = dayMovements.filter((m) => m.type === 'EXIT').reduce((s, m) => s + Math.abs(m.quantity), 0);
      return { day: day.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), entrees, sorties };
    });
  }

  private async getActivity(companyId: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: { companyId },
      include: { product: true, performedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return movements.map((m) => ({
      time: m.createdAt,
      user: m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : 'Système',
      action: MOVEMENT_LABELS[m.type] ?? 'a effectué un mouvement de stock',
      reference: m.reference || m.product.sku,
      type: m.type,
    }));
  }
}

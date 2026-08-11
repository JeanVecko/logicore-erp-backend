import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryCountsService } from './inventory-counts.service';

/** Génère automatiquement le relevé d'inventaire du mois, 7 jours avant la fin de celui-ci. */
@Injectable()
export class InventoryCountsCron {
  private readonly logger = new Logger(InventoryCountsCron.name);

  constructor(private readonly inventoryCountsService: InventoryCountsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleMonthEndGeneration(): Promise<void> {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const triggerDay = lastDayOfMonth - 7;

    if (now.getDate() !== triggerDay) return;

    this.logger.log('J-7 avant fin de mois — génération automatique des relevés d\'inventaire...');
    const results = await this.inventoryCountsService.generateForAllCompanies();
    this.logger.log(`${results.length} relevé(s) généré(s).`);
  }
}

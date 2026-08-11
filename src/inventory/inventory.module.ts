import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryCountsService } from './inventory-counts.service';
import { InventoryCountsRepository } from './inventory-counts.repository';
import { InventoryCountsCron } from './inventory-counts.cron';

@Module({
  controllers: [InventoryController, InventoryCountsController],
  providers: [
    InventoryService,
    InventoryRepository,
    InventoryCountsService,
    InventoryCountsRepository,
    InventoryCountsCron,
  ],
  exports: [InventoryService, InventoryRepository, InventoryCountsService],
})
export class InventoryModule {}

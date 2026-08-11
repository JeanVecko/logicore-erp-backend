import { Module } from '@nestjs/common';
import { InventoryCampaignsController } from './inventory-campaigns.controller';
import { InventoryCampaignsService } from './inventory-campaigns.service';
import { InventoryCampaignsRepository } from './inventory-campaigns.repository';
import { WarehousesModule } from '../warehouses/warehouses.module';

@Module({
  imports: [WarehousesModule],
  controllers: [InventoryCampaignsController],
  providers: [InventoryCampaignsService, InventoryCampaignsRepository],
  exports: [InventoryCampaignsService],
})
export class InventoryCampaignsModule {}

import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { PurchaseOrderSendLogsRepository } from './purchase-order-send-log.repository';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { InventoryModule } from '../inventory/inventory.module';
import { WarehousesModule } from '../warehouses/warehouses.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { StockMovementsModule } from '../stock-movements/stock-movements.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InventoryModule, WarehousesModule, SuppliersModule, StockMovementsModule, EmailModule, NotificationsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, PurchaseOrdersRepository, PurchaseOrderSendLogsRepository, PurchaseOrderPdfService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}

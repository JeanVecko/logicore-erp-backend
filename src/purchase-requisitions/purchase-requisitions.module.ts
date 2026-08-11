import { Module } from '@nestjs/common';
import { PurchaseRequisitionsController } from './purchase-requisitions.controller';

@Module({
  controllers: [PurchaseRequisitionsController],
})
export class PurchaseRequisitionsModule {}

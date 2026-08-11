import { Module } from '@nestjs/common';
import { DeliveryNotesController } from './delivery-notes.controller';
import { DeliveryNotesService } from './delivery-notes.service';
import { DeliveryNotesRepository } from './delivery-notes.repository';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [DeliveryNotesController],
  providers: [DeliveryNotesService, DeliveryNotesRepository],
  exports: [DeliveryNotesService],
})
export class DeliveryNotesModule {}

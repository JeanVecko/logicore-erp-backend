import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const PURCHASE_ORDER_STATUSES = ['DRAFT', 'PENDING_VALIDATION', 'VALIDATED', 'SENT_TO_SUPPLIER', 'ISSUED', 'RECEIVED'] as const;

export class QueryPurchaseOrdersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PURCHASE_ORDER_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_ORDER_STATUSES)
  status?: (typeof PURCHASE_ORDER_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

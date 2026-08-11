import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const DELIVERY_NOTE_STATUSES = ['PREPARING', 'SHIPPED', 'DELIVERED'] as const;

export class QueryDeliveryNotesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DELIVERY_NOTE_STATUSES })
  @IsOptional()
  @IsIn(DELIVERY_NOTE_STATUSES)
  status?: (typeof DELIVERY_NOTE_STATUSES)[number];
}

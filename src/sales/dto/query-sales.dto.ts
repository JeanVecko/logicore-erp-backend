import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const SALE_STATUSES = ['DRAFT', 'VALIDATED', 'CANCELLED'] as const;

export class QuerySalesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SALE_STATUSES })
  @IsOptional()
  @IsIn(SALE_STATUSES)
  status?: (typeof SALE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const INVOICE_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID'] as const;

export class QueryInvoicesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional()
  @IsIn(INVOICE_STATUSES)
  status?: (typeof INVOICE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

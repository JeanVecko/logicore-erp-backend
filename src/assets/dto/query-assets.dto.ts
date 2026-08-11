import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ASSET_STATUSES } from './create-asset.dto';

export class QueryAssetsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ASSET_STATUSES })
  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: (typeof ASSET_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Filtrer par dépôt de rattachement' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { VEHICLE_STATUSES } from './create-vehicle.dto';

export class QueryVehiclesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VEHICLE_STATUSES })
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  status?: (typeof VEHICLE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Filtrer par dépôt de rattachement' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

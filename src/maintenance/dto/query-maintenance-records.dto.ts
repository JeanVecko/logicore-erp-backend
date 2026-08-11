import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MAINTENANCE_STATUSES } from './create-maintenance-record.dto';

export class QueryMaintenanceRecordsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MAINTENANCE_STATUSES })
  @IsOptional()
  @IsIn(MAINTENANCE_STATUSES)
  status?: (typeof MAINTENANCE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Filtrer sur les interventions liées à un véhicule' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrer sur les interventions liées à un équipement' })
  @IsOptional()
  @IsString()
  assetId?: string;
}

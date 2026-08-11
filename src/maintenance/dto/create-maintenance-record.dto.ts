import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const INTERVENTION_TYPES = ['PREVENTIVE', 'CURATIVE'] as const;
export const MAINTENANCE_STATUSES = ['PLANNED', 'IN_PROGRESS', 'DONE'] as const;

export class CreateMaintenanceRecordDto {
  @ApiPropertyOptional({ description: 'Identifiant du véhicule concerné — exactement un de vehicleId/assetId requis' })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: "Identifiant de l'équipement concerné — exactement un de vehicleId/assetId requis" })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiProperty({ enum: INTERVENTION_TYPES })
  @IsIn(INTERVENTION_TYPES)
  interventionType: (typeof INTERVENTION_TYPES)[number];

  @ApiPropertyOptional({ enum: MAINTENANCE_STATUSES, default: 'PLANNED' })
  @IsOptional()
  @IsIn(MAINTENANCE_STATUSES)
  status?: (typeof MAINTENANCE_STATUSES)[number];

  @ApiProperty({ example: 'Vidange + contrôle freins' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: "Date planifiée de l'intervention" })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ description: "Date de fin d'intervention" })
  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: 'Garage Mbarga & Fils' })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

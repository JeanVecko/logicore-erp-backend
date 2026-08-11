import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export const VEHICLE_STATUSES = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'] as const;

export class CreateVehicleDto {
  @ApiProperty({ example: 'LT-2481-CM' })
  @IsString()
  @IsNotEmpty()
  plate: string;

  @ApiProperty({ example: 'Camion benne' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'Hilux' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Jean Mbarga' })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({ description: "Identifiant de l'entrepôt/dépôt de rattachement" })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ example: 'Diesel' })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional({ enum: VEHICLE_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  status?: (typeof VEHICLE_STATUSES)[number];

  @ApiPropertyOptional({ description: "Date d'expiration de l'assurance" })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

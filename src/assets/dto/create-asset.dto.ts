import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const ASSET_STATUSES = ['ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'] as const;

export class CreateAssetDto {
  @ApiProperty({ example: 'Groupe électrogène 60kVA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Groupe électrogène' })
  @IsString()
  @IsNotEmpty()
  assetType: string;

  @ApiPropertyOptional({ example: 'Caterpillar' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'C4.4' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Numéro de série' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Identifiant du dépôt de rattachement' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: ASSET_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(ASSET_STATUSES)
  status?: (typeof ASSET_STATUSES)[number];

  @ApiPropertyOptional({ description: "Date d'acquisition" })
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiPropertyOptional({ minimum: 0, description: "Valeur d'achat" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

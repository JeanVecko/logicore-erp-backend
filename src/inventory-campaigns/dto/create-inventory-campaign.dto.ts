import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export const CAMPAIGN_TYPES = ['Général', 'Tournant', 'Ciblé'] as const;
export const CAMPAIGN_STATUSES = ['Planifié', 'En cours', 'Écarts à valider', 'Clôturé'] as const;

export class CreateInventoryCampaignDto {
  @ApiProperty({ description: 'Entrepôt concerné' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ enum: CAMPAIGN_TYPES })
  @IsIn(CAMPAIGN_TYPES)
  type: (typeof CAMPAIGN_TYPES)[number];

  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES, default: 'Planifié' })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: (typeof CAMPAIGN_STATUSES)[number];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  articlesCount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  countedCount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ecartsCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsable?: string;

  @ApiProperty({ description: 'Date planifiée du comptage' })
  @IsDateString()
  scheduledDate: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { MOVEMENT_TYPES } from './create-stock-movement.dto';

/**
 * Correction d'un mouvement existant — réservé au Super Admin. Volontairement limité à
 * type/quantity/reference/notes : changer l'article ou le(s) dépôt(s) équivaut à une autre
 * opération (supprimer puis recréer), plus sûr que de tenter de réconcilier les deux stocks.
 */
export class UpdateStockMovementDto {
  @ApiPropertyOptional({ enum: MOVEMENT_TYPES })
  @IsOptional()
  @IsIn(MOVEMENT_TYPES)
  type?: (typeof MOVEMENT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

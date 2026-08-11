import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const DEFAULT_UNITS = ['pièce', 'sac', 'bidon', 'tube', 'rouleau', 'boîte', 'barre', 'litre', 'kg', 'm', 'm³'];

export class CreateProductDto {
  // Pas de champ `sku` ici volontairement : la référence est générée par le backend
  // (ProductsService) à partir du code de la catégorie — jamais saisie par le client.
  @ApiProperty({ example: 'Ciment CPJ 45 — sac 50kg' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Identifiant de la catégorie (dans mon entreprise)" })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Identifiant du type de matériel (doit appartenir à la catégorie sélectionnée) — deuxième segment de la référence auto-générée' })
  @IsString()
  @IsNotEmpty()
  typeId: string;

  @ApiProperty({ enum: DEFAULT_UNITS, example: 'sac' })
  @IsString()
  @IsIn(DEFAULT_UNITS)
  unit: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional({ default: 'FC' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Seuil de réapprovisionnement', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;
}

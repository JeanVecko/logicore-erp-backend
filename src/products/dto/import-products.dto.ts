import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ImportProductRowDto {
  // Volontairement pas de @IsNotEmpty ici : une ligne invalide (ex. nom manquant) est
  // rapportée individuellement par le service, sans faire échouer tout le lot.
  @ApiPropertyOptional({ example: 'Ciment CPJ 45 — sac 50kg' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Nom de catégorie — créée automatiquement si elle n\'existe pas encore' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Nom du type de matériel (au sein de la catégorie) — créé automatiquement s'il n'existe pas encore" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  // Pas de champ `sku` ici volontairement : la référence est toujours générée par le backend,
  // même via l'import — une colonne SKU dans le fichier serait ignorée.

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

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ description: 'Quantité initiale — nécessite warehouseId au niveau du lot', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

export class ImportProductsDto {
  @ApiPropertyOptional({ description: "Dépôt où saisir les quantités initiales — requis si au moins une ligne a une quantité" })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ type: [ImportProductRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  rows: ImportProductRowDto[];
}

export interface ImportProductsResult {
  created: number;
  categoriesCreated: number;
  typesCreated: number;
  errors: Array<{ row: number; name: string; reason: string }>;
}

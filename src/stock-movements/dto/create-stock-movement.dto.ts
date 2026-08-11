import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const MOVEMENT_TYPES = ['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'] as const;

export class CreateStockMovementDto {
  @ApiProperty({ description: 'Identifiant article' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Entrepôt source (ou concerné pour ENTRY/EXIT/ADJUSTMENT)' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ enum: MOVEMENT_TYPES })
  @IsIn(MOVEMENT_TYPES)
  type: (typeof MOVEMENT_TYPES)[number];

  @ApiProperty({
    description:
      'Quantité. Positive pour ENTRY/EXIT/TRANSFER (le sens est déterminé par `type`). ' +
      'Pour ADJUSTMENT, signée : positive = correction à la hausse, négative = à la baisse.',
  })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ description: 'Entrepôt de destination — requis si type=TRANSFER' })
  @IsOptional()
  @IsString()
  targetWarehouseId?: string;

  @ApiPropertyOptional({ example: 'BC-2026-0341' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

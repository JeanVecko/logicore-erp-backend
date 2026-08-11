import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateFromAlertsDto {
  @ApiPropertyOptional({ description: "Entrepôt concerné — par défaut, celui de l'utilisateur connecté" })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string;
}

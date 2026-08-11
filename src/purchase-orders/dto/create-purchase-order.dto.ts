import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreatePurchaseOrderLineDto } from './create-purchase-order-line.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @ApiPropertyOptional({ description: "Requis pour une création manuelle (le fournisseur doit avoir une adresse e-mail) — absent pour les bons générés depuis les alertes de seuil." })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Champ interne — calculé côté serveur à partir du fournisseur sélectionné, ignoré si envoyé par le client.' })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ description: "Affiché dans le PDF envoyé au fournisseur (paiement, délais...)." })
  @IsOptional()
  @IsString()
  purchaseConditions?: string;

  @ApiPropertyOptional({ description: 'Affiché dans le PDF envoyé au fournisseur.' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    enum: ['ISSUED'],
    description:
      "Réservé à l'émission automatique depuis les alertes de seuil (statut ISSUED, instantané, sans fournisseur). " +
      "Omis pour une création manuelle : le bon démarre alors en BROUILLON et doit suivre le workflow de validation/envoi.",
  })
  @IsOptional()
  @IsIn(['ISSUED'])
  status?: 'ISSUED';

  @ApiProperty({ type: [CreatePurchaseOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines: CreatePurchaseOrderLineDto[];
}

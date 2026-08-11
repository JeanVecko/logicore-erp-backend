import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SendPurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Message complémentaire inclus dans le corps du e-mail envoyé au fournisseur.' })
  @IsOptional()
  @IsString()
  message?: string;
}

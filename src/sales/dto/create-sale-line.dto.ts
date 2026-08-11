import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSaleLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional({ default: 0, description: 'Remise en montant fixe sur la ligne' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

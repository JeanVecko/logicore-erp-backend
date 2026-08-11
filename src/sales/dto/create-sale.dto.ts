import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateSaleLineDto } from './create-sale-line.dto';

export class CreateSaleDto {
  @ApiPropertyOptional({ description: "Optionnel — relie la vente à une fiche Customer existante. Absent pour un client saisi librement (voir customerName)." })
  @IsOptional() @IsString() customerId?: string;

  @ApiProperty({ description: "Nom du client au moment de la vente — toujours requis, qu'il soit saisi librement ou recopié d'une fiche Customer." })
  @IsString() @IsNotEmpty() customerName: string;

  @ApiProperty() @IsString() @IsNotEmpty() warehouseId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiProperty({ type: [CreateSaleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines: CreateSaleLineDto[];
}

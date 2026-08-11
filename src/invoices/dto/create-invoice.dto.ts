import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty() @IsString() @IsNotEmpty() saleId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateQuoteLineDto } from './create-quote-line.dto';

export class CreateQuoteDto {
  @ApiProperty() @IsString() @IsNotEmpty() customerId: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;

  @ApiProperty({ type: [CreateQuoteLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineDto)
  lines: CreateQuoteLineDto[];
}

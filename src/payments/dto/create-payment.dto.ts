import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHECK', 'OTHER'] as const;

export class CreatePaymentDto {
  @ApiProperty() @IsString() @IsNotEmpty() invoiceId: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty({ enum: PAYMENT_METHODS }) @IsIn(PAYMENT_METHODS) method: (typeof PAYMENT_METHODS)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

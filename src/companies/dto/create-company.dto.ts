import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const LOGO_DATA_URI_REGEX = /^data:image\/(png|jpe?g|webp);base64,/;

export class CreateCompanyDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ description: 'Logo encodé en base64 (data URI PNG/JPEG/WEBP), redimensionné côté client avant envoi.' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000, { message: 'Le logo est trop volumineux.' })
  @Matches(LOGO_DATA_URI_REGEX, { message: 'Le logo doit être une image encodée en base64 (PNG/JPEG/WEBP).' })
  logoUrl?: string;
  @ApiPropertyOptional({ default: 'FC' }) @IsOptional() @IsString() baseCurrency?: string;
  @ApiPropertyOptional({ default: 'Africa/Douala' }) @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ enum: ['LOGISTICS', 'LOGISTICS_SALES'], default: 'LOGISTICS' })
  @IsOptional()
  @IsIn(['LOGISTICS', 'LOGISTICS_SALES'])
  accountType?: 'LOGISTICS' | 'LOGISTICS_SALES';
  @ApiPropertyOptional({ default: false, description: 'Autorise une vente à faire passer un stock sous zéro.' })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;
}

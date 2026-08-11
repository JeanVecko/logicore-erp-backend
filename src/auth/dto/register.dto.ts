import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const LOGO_DATA_URI_REGEX = /^data:image\/(png|jpe?g|webp);base64,/;

export class RegisterDto {
  @ApiProperty({ example: 'LogiCore SA' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({
    enum: ['LOGISTICS', 'LOGISTICS_SALES'],
    default: 'LOGISTICS',
    description: 'LOGISTICS = gestion logistique uniquement. LOGISTICS_SALES = logistique + module Vente.',
  })
  @IsOptional()
  @IsIn(['LOGISTICS', 'LOGISTICS_SALES'])
  accountType?: 'LOGISTICS' | 'LOGISTICS_SALES';

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Vecko' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'jean.vecko@logicore.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cur3P@ssword!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @ApiPropertyOptional({ description: "Logo de l'entreprise, encodé en base64 (data URI PNG/JPEG/WEBP), redimensionné côté client avant envoi." })
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000, { message: 'Le logo est trop volumineux.' })
  @Matches(LOGO_DATA_URI_REGEX, { message: 'Le logo doit être une image encodée en base64 (PNG/JPEG/WEBP).' })
  logoUrl?: string;
}

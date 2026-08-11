import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Matériaux' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'MAT',
    description: 'Code court unique (2 à 10 lettres/chiffres) — base de la référence auto-générée des articles de cette catégorie (ex: MAT-0001).',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'Le code doit contenir entre 2 et 10 lettres ou chiffres (sans espace ni accent)' })
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

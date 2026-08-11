import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateProductTypeDto {
  @ApiProperty({ description: 'Catégorie à laquelle ce type appartient' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Ordinateur' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'ORD',
    description: 'Code court unique au sein de la catégorie (2 à 10 lettres/chiffres) — deuxième segment de la référence auto-générée (ex: INFO-ORD-001).',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'Le code doit contenir entre 2 et 10 lettres ou chiffres (sans espace ni accent)' })
  code: string;
}

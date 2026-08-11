import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLE_CODES } from '../../common/constants/roles.constant';

const ROLE_CODE_VALUES = Object.values(ROLE_CODES);

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiProperty({ enum: ROLE_CODE_VALUES })
  @IsIn(ROLE_CODE_VALUES)
  roleCode: string;

  @ApiPropertyOptional({ description: 'Entrepôt de rattachement' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

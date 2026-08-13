import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyLoginCodeDto {
  @ApiProperty({ example: 'jean.vecko@logicore.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482913', description: 'Code à 6 chiffres reçu par e-mail' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres.' })
  code: string;
}

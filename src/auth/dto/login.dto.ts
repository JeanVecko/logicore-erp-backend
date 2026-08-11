import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jean.vecko@logicore.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cur3P@ssword!' })
  @IsString()
  @MinLength(1)
  password: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { ROLE_CODES } from '../../common/constants/roles.constant';

const ROLE_CODE_VALUES = Object.values(ROLE_CODES);

export class CreateInvitationDto {
  @ApiProperty() @IsEmail() email: string;

  @ApiProperty({ enum: ROLE_CODE_VALUES, description: 'SUPER_ADMIN est toujours rejeté, même envoyé par un Super Admin.' })
  @IsIn(ROLE_CODE_VALUES)
  roleCode: string;

  @ApiPropertyOptional({ description: 'Entrepôt de rattachement' })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

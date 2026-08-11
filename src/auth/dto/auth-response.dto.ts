import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() companyId: string;
  @ApiProperty() roleCode: string;
  @ApiProperty() roleName: string;
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty({ enum: ['LOGISTICS', 'LOGISTICS_SALES'] }) accountType: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

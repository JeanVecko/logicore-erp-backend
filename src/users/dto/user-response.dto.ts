import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() email: string;
  @Expose() @ApiProperty() firstName: string;
  @Expose() @ApiProperty() lastName: string;
  @Expose() @ApiProperty({ required: false, nullable: true }) phone: string | null;
  @Expose() @ApiProperty() companyId: string;
  @Expose() @ApiProperty({ required: false, nullable: true }) warehouseId: string | null;
  @Expose() @ApiProperty() roleCode: string;
  @Expose() @ApiProperty() roleName: string;
  @Expose() @ApiProperty() isActive: boolean;
  @Expose() @ApiProperty() isEmailVerified: boolean;
  @Expose() @ApiProperty({ required: false, nullable: true }) lastLoginAt: Date | null;
  @Expose() @ApiProperty() createdAt: Date;
  // passwordHash volontairement absent : @Exclude() par défaut sur la classe.
}

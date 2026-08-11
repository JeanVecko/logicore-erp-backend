import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false, nullable: true }) description: string | null;
  @ApiProperty() isSystem: boolean;
  @ApiProperty({ type: [String] }) permissions: string[];
}

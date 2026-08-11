import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() module: string;
  @ApiProperty() action: string;
  @ApiProperty({ required: false, nullable: true }) description: string | null;
}

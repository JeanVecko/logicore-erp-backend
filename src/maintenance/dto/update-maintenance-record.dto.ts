import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMaintenanceRecordDto } from './create-maintenance-record.dto';

export class UpdateMaintenanceRecordDto extends PartialType(CreateMaintenanceRecordDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

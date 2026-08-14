import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Cible une autre entreprise que la sienne — ignoré sauf pour le Super Admin." })
  @IsOptional()
  @IsString()
  companyId?: string;
}

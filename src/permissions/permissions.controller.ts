import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Liste le catalogue de permissions (optionnellement filtré par module)' })
  @ApiQuery({ name: 'module', required: false })
  findAll(@Query('module') module?: string) {
    return this.permissionsService.findAll(module);
  }

  @Get(':id')
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Détail d’une permission' })
  findOne(@Param('id', ParseCuidPipe) id: string) {
    return this.permissionsService.findById(id);
  }
}

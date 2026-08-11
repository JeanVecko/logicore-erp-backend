import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import { QueryMaintenanceRecordsDto } from './dto/query-maintenance-records.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @Permissions('maintenance:read')
  @ApiOperation({ summary: 'Liste les interventions de maintenance (véhicules et équipements)' })
  findAll(@Query() query: QueryMaintenanceRecordsDto, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('maintenance:create')
  @ApiOperation({ summary: 'Planifie une intervention de maintenance sur un véhicule ou un équipement' })
  create(@Body() dto: CreateMaintenanceRecordDto, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('maintenance:read')
  @ApiOperation({ summary: "Détail d'une intervention" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('maintenance:update')
  @ApiOperation({ summary: "Met à jour une intervention (statut, date, coût...)" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateMaintenanceRecordDto, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('maintenance:delete')
  @ApiOperation({ summary: 'Annule une intervention (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.maintenanceService.deactivate(id, user.companyId);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FleetService } from './fleet.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get()
  @Permissions('fleet:read')
  @ApiOperation({ summary: 'Liste les véhicules du parc automobile de mon entreprise' })
  findAll(@Query() query: QueryVehiclesDto, @CurrentUser() user: JwtPayload) {
    return this.fleetService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('fleet:create')
  @ApiOperation({ summary: 'Ajoute un véhicule au parc automobile' })
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: JwtPayload) {
    return this.fleetService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('fleet:read')
  @ApiOperation({ summary: "Détail d'un véhicule" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.fleetService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('fleet:update')
  @ApiOperation({ summary: 'Met à jour un véhicule (statut, kilométrage, conducteur, assurance...)' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateVehicleDto, @CurrentUser() user: JwtPayload) {
    return this.fleetService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('fleet:delete')
  @ApiOperation({ summary: 'Retire un véhicule du parc actif (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.fleetService.deactivate(id, user.companyId);
  }
}

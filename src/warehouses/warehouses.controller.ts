import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @Permissions('warehouses:read')
  @ApiOperation({ summary: 'Liste les entrepôts de mon entreprise' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.warehousesService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('warehouses:create')
  @ApiOperation({ summary: 'Crée un entrepôt' })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: JwtPayload) {
    return this.warehousesService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('warehouses:read')
  @ApiOperation({ summary: "Détail d'un entrepôt" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.warehousesService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('warehouses:update')
  @ApiOperation({ summary: 'Met à jour un entrepôt' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateWarehouseDto, @CurrentUser() user: JwtPayload) {
    return this.warehousesService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('warehouses:delete')
  @ApiOperation({ summary: 'Désactive un entrepôt (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.warehousesService.deactivate(id, user.companyId);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Permissions('suppliers:read')
  @ApiOperation({ summary: 'Liste les fournisseurs de mon entreprise' })
  findAll(@Query() query: QuerySuppliersDto, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('suppliers:create')
  @ApiOperation({ summary: 'Crée un fournisseur' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('suppliers:read')
  @ApiOperation({ summary: "Détail d'un fournisseur" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('suppliers:update')
  @ApiOperation({ summary: 'Met à jour un fournisseur' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateSupplierDto, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('suppliers:delete')
  @ApiOperation({ summary: 'Désactive un fournisseur (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.suppliersService.deactivate(id, user.companyId);
  }
}

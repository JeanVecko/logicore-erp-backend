import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductTypesService } from './product-types.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { QueryProductTypesDto } from './dto/query-product-types.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('Product Types')
@ApiBearerAuth()
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly service: ProductTypesService) {}

  @Get()
  @Permissions('categories:read')
  @ApiOperation({ summary: 'Liste les types de matériel de mon entreprise (filtrable par catégorie)' })
  findAll(@Query() query: QueryProductTypesDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:create')
  @ApiOperation({ summary: "Crée un type de matériel au sein d'une catégorie — réservé à l'Admin (ou au Super Admin)" })
  create(@Body() dto: CreateProductTypeDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('categories:read')
  @ApiOperation({ summary: "Détail d'un type de matériel" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Get(':id/next-sku')
  @Permissions('categories:read')
  @ApiOperation({ summary: 'Aperçu (non réservé) de la prochaine référence pour ce type' })
  previewNextSku(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.previewNextSku(id, user.companyId).then((sku) => ({ sku }));
  }

  @Patch(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:update')
  @ApiOperation({ summary: "Met à jour un type de matériel — réservé à l'Admin (ou au Super Admin)" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateProductTypeDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:delete')
  @ApiOperation({ summary: "Désactive un type de matériel (si aucun article rattaché) — réservé à l'Admin (ou au Super Admin)" })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deactivate(id, user.companyId);
  }
}

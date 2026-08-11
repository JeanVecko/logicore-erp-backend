import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('products:read')
  @ApiOperation({ summary: "Liste le catalogue d'articles de mon entreprise" })
  findAll(@Query() query: QueryProductsDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.findAll(user.companyId, query);
  }

  @Post()
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('products:create')
  @ApiOperation({ summary: "Crée un article — réservé à l'Admin de l'entreprise (ou au Super Admin), pour préserver la fiabilité du référentiel lors des rapprochements de stock" })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(user.companyId, dto);
  }

  @Post('import')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('products:create')
  @ApiOperation({ summary: 'Importe des articles en masse (fichier Excel côté client) — crée les catégories manquantes automatiquement' })
  importProducts(@Body() dto: ImportProductsDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.importProducts(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('products:read')
  @ApiOperation({ summary: "Détail d'un article" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('products:update')
  @ApiOperation({ summary: "Met à jour un article — réservé à l'Admin de l'entreprise (ou au Super Admin)" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('products:delete')
  @ApiOperation({ summary: "Désactive un article (suppression logique) — réservé à l'Admin de l'entreprise (ou au Super Admin)" })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.deactivate(id, user.companyId);
  }
}

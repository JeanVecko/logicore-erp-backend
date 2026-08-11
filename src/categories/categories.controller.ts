import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('categories:read')
  @ApiOperation({ summary: 'Liste les catégories de mon entreprise' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.findAll(user.companyId, query);
  }

  @Post()
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:create')
  @ApiOperation({ summary: "Crée une catégorie — réservé à l'Admin de l'entreprise (ou au Super Admin)" })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('categories:read')
  @ApiOperation({ summary: "Détail d'une catégorie" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:update')
  @ApiOperation({ summary: "Met à jour une catégorie — réservé à l'Admin de l'entreprise (ou au Super Admin)" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('categories:delete')
  @ApiOperation({ summary: "Désactive une catégorie (si aucun article rattaché) — réservé à l'Admin de l'entreprise (ou au Super Admin)" })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.categoriesService.deactivate(id, user.companyId);
  }
}

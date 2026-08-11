import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Liste toutes les entreprises (Super Admin uniquement)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.companiesService.findAll(query);
  }

  @Post()
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Crée une entreprise (Super Admin uniquement)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get(':id')
  @Permissions('companies:read')
  @ApiOperation({ summary: "Détail d'une entreprise (la sienne, sauf Super Admin)" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    this.assertOwnCompanyOrSuperAdmin(id, user);
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @Permissions('companies:update')
  @ApiOperation({ summary: "Met à jour une entreprise (la sienne, sauf Super Admin) — accountType/allowNegativeStock réservés au Super Admin" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: JwtPayload) {
    this.assertOwnCompanyOrSuperAdmin(id, user);
    // Le type de compte (module Vente) et l'autorisation de stock négatif sont des leviers business
    // qui ne doivent pas être auto-activables par l'admin d'une entreprise via son propre accès
    // "companies:update" — seul un Super Admin peut les changer.
    if ((dto.accountType !== undefined || dto.allowNegativeStock !== undefined) && user.roleCode !== ROLE_CODES.SUPER_ADMIN) {
      throw new ForbiddenException('Seul un Super Admin peut modifier le type de compte ou l\'autorisation de stock négatif.');
    }
    return this.companiesService.update(id, dto);
  }

  private assertOwnCompanyOrSuperAdmin(companyId: string, user: JwtPayload): void {
    if (user.roleCode !== ROLE_CODES.SUPER_ADMIN && user.companyId !== companyId) {
      throw new ForbiddenException("Accès limité à votre propre entreprise");
    }
  }
}

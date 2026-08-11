import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Sales')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Get()
  @Permissions('sales:read')
  @ApiOperation({ summary: 'Liste des ventes (sert aussi d\'historique des ventes)' })
  findAll(@Query() query: QuerySalesDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('sales:create')
  @ApiOperation({ summary: 'Crée une vente en brouillon (aucun impact sur le stock tant qu\'elle n\'est pas validée)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('sales:read')
  @ApiOperation({ summary: "Détail d'une vente" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Patch(':id/validate')
  @Permissions('sales:update')
  @ApiOperation({ summary: 'Valide la vente : génère les sorties de stock correspondantes' })
  validate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.validate(id, user.companyId, user.sub);
  }

  @Patch(':id/cancel')
  @Permissions('sales:update')
  @ApiOperation({ summary: 'Annule une vente en brouillon' })
  cancel(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(id, user.companyId);
  }
}

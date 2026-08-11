import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryCountsService } from './inventory-counts.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

/**
 * Relevés d'inventaire mensuels — générés automatiquement (J-7 fin de mois) ou manuellement.
 * Volontairement pas de PATCH ni de DELETE : ces relevés sont immuables une fois créés,
 * ils servent de référence figée pour comparer comptage physique et stock système.
 */
@ApiTags('InventoryCounts')
@ApiBearerAuth()
@Controller('inventory/counts')
export class InventoryCountsController {
  constructor(private readonly inventoryCountsService: InventoryCountsService) {}

  @Get()
  @Permissions('inventory:read')
  @ApiOperation({ summary: "Liste les relevés d'inventaire déjà générés" })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryCountsService.findAll(user.companyId, query);
  }

  @Get(':id')
  @Permissions('inventory:read')
  @ApiOperation({ summary: "Détail d'un relevé (toutes les lignes article/dépôt)" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.inventoryCountsService.findById(id, user.companyId);
  }

  @Post('generate')
  @Permissions('inventory:create')
  @ApiOperation({ summary: "Génère manuellement le relevé du mois courant (échoue si déjà généré)" })
  generate(@CurrentUser() user: JwtPayload) {
    return this.inventoryCountsService.generate(user.companyId, 'MANUAL');
  }
}

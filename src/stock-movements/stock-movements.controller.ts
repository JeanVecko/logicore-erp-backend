import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('StockMovements')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @Permissions('stock-movements:read')
  @ApiOperation({ summary: 'Journal des mouvements de stock (entrées, sorties, transferts, ajustements)' })
  findAll(@Query() query: QueryStockMovementsDto, @CurrentUser() user: JwtPayload) {
    return this.stockMovementsService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('stock-movements:create')
  @ApiOperation({ summary: 'Enregistre un mouvement de stock et met à jour le stock courant' })
  create(@Body() dto: CreateStockMovementDto, @CurrentUser() user: JwtPayload) {
    return this.stockMovementsService.create(user.companyId, user.sub, dto);
  }

  @Patch(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('stock-movements:update')
  @ApiOperation({ summary: "Corrige un mouvement — réservé à l'Admin de l'entreprise (ou au Super Admin) — recalcule le stock en conséquence" })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateStockMovementDto, @CurrentUser() user: JwtPayload) {
    return this.stockMovementsService.update(user.companyId, user.sub, id, dto);
  }

  @Delete(':id')
  @Roles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMIN)
  @Permissions('stock-movements:delete')
  @ApiOperation({ summary: "Supprime un mouvement — réservé à l'Admin de l'entreprise (ou au Super Admin) — annule son effet sur le stock" })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.stockMovementsService.remove(user.companyId, user.sub, id);
  }
}

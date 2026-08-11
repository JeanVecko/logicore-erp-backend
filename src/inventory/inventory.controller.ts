import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('alerts')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Articles sous le seuil de réapprovisionnement (tous entrepôts)' })
  getAlerts(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getAlerts(user.companyId);
  }

  @Get()
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Stock courant par article et par entrepôt' })
  findAll(@Query() query: QueryInventoryDto, @CurrentUser() user: JwtPayload) {
    return this.inventoryService.findAll(user.companyId, query);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryCampaignsService } from './inventory-campaigns.service';
import { CreateInventoryCampaignDto } from './dto/create-inventory-campaign.dto';
import { UpdateInventoryCampaignDto } from './dto/update-inventory-campaign.dto';
import { QueryInventoryCampaignsDto } from './dto/query-inventory-campaigns.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Inventory Campaigns')
@ApiBearerAuth()
@Controller('inventory-campaigns')
export class InventoryCampaignsController {
  constructor(private readonly service: InventoryCampaignsService) {}

  @Get()
  @Permissions('inventory:read')
  @ApiOperation({ summary: "Liste les campagnes de comptage physique de mon entreprise" })
  findAll(@Query() query: QueryInventoryCampaignsDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('inventory:create')
  @ApiOperation({ summary: 'Planifie une nouvelle campagne de comptage physique' })
  create(@Body() dto: CreateInventoryCampaignDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('inventory:read')
  @ApiOperation({ summary: "Détail d'une campagne" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('inventory:update')
  @ApiOperation({ summary: 'Met à jour une campagne (statut, progression, écarts...)' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateInventoryCampaignDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('inventory:delete')
  @ApiOperation({ summary: 'Supprime une campagne' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.companyId);
  }
}

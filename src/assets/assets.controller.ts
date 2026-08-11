import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('assets:read')
  @ApiOperation({ summary: 'Liste les équipements de mon entreprise' })
  findAll(@Query() query: QueryAssetsDto, @CurrentUser() user: JwtPayload) {
    return this.assetsService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('assets:create')
  @ApiOperation({ summary: 'Ajoute un équipement' })
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: JwtPayload) {
    return this.assetsService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('assets:read')
  @ApiOperation({ summary: "Détail d'un équipement" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.assetsService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('assets:update')
  @ApiOperation({ summary: 'Met à jour un équipement (statut, dépôt, affectation...)' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateAssetDto, @CurrentUser() user: JwtPayload) {
    return this.assetsService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('assets:delete')
  @ApiOperation({ summary: 'Retire un équipement du parc actif (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.assetsService.deactivate(id, user.companyId);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveryNotesService } from './delivery-notes.service';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { QueryDeliveryNotesDto } from './dto/query-delivery-notes.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('DeliveryNotes')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(private readonly service: DeliveryNotesService) {}

  @Get()
  @Permissions('delivery-notes:read')
  @ApiOperation({ summary: 'Liste des bons de livraison' })
  findAll(@Query() query: QueryDeliveryNotesDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('delivery-notes:create')
  @ApiOperation({ summary: "Génère le bon de livraison d'une vente validée" })
  create(@Body() dto: CreateDeliveryNoteDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('delivery-notes:read')
  @ApiOperation({ summary: "Détail d'un bon de livraison" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Patch(':id/deliver')
  @Permissions('delivery-notes:update')
  @ApiOperation({ summary: 'Marque le bon de livraison comme livré' })
  markDelivered(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markDelivered(id, user.companyId);
  }
}

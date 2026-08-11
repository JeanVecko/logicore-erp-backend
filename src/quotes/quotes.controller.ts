import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Quotes')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Get()
  @Permissions('quotes:read')
  @ApiOperation({ summary: 'Liste des devis' })
  findAll(@Query() query: QueryQuotesDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('quotes:create')
  @ApiOperation({ summary: 'Crée un devis en brouillon' })
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('quotes:read')
  @ApiOperation({ summary: "Détail d'un devis" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('quotes:update')
  @ApiOperation({ summary: 'Met à jour un devis brouillon ou envoyé' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateQuoteDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, user.companyId, dto);
  }

  @Patch(':id/send')
  @Permissions('quotes:update')
  @ApiOperation({ summary: 'Marque le devis comme envoyé au client' })
  send(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.send(id, user.companyId);
  }

  @Patch(':id/accept')
  @Permissions('quotes:update')
  @ApiOperation({ summary: 'Marque le devis comme accepté par le client' })
  accept(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.accept(id, user.companyId);
  }

  @Patch(':id/reject')
  @Permissions('quotes:update')
  @ApiOperation({ summary: 'Marque le devis comme refusé par le client' })
  reject(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.reject(id, user.companyId);
  }

  @Post(':id/convert')
  @Permissions('quotes:update', 'sales:create')
  @ApiOperation({ summary: 'Convertit un devis accepté en vente (brouillon)' })
  convert(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.convert(id, user.companyId, user.sub);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Invoices')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Permissions('invoices:read')
  @ApiOperation({ summary: 'Liste des factures' })
  findAll(@Query() query: QueryInvoicesDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('invoices:create')
  @ApiOperation({ summary: "Génère la facture d'une vente validée" })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('invoices:read')
  @ApiOperation({ summary: "Détail d'une facture" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateFromAlertsDto } from './dto/create-from-alerts.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { SendPurchaseOrderDto } from './dto/send-purchase-order.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('PurchaseOrders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Permissions('purchase-orders:read')
  @ApiOperation({ summary: 'Liste des bons de commande' })
  findAll(@Query() query: QueryPurchaseOrdersDto, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('purchase-orders:create')
  @ApiOperation({ summary: 'Crée un bon de commande — en brouillon si créé manuellement (fournisseur obligatoire), émis directement si status=ISSUED (flux automatique alertes)' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.create(user.companyId, user.sub, dto);
  }

  @Post('from-alerts')
  @Permissions('purchase-orders:create')
  @ApiOperation({ summary: "Émet directement un bon de commande regroupant tous les articles en alerte de seuil sur l'entrepôt" })
  createFromAlerts(@Body() dto: CreateFromAlertsDto, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.createFromAlerts(user.companyId, user.sub, dto);
  }

  @Get(':id')
  @Permissions('purchase-orders:read')
  @ApiOperation({ summary: "Détail d'un bon de commande" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.findById(id, user.companyId);
  }

  @Get(':id/pdf')
  @Permissions('purchase-orders:read')
  @ApiOperation({ summary: 'Télécharge le PDF du bon de commande (généré côté serveur)' })
  async downloadPdf(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const po = await this.purchaseOrdersService.findById(id, user.companyId);
    const buffer = await this.purchaseOrdersService.generatePdf(id, user.companyId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${po.ref}.pdf"`);
    res.send(buffer);
  }

  @Get(':id/send-history')
  @Permissions('purchase-orders:read')
  @ApiOperation({ summary: "Historique des tentatives d'envoi au fournisseur" })
  getSendHistory(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.getSendHistory(id, user.companyId);
  }

  @Patch(':id/submit')
  @Permissions('purchase-orders:update')
  @ApiOperation({ summary: 'Soumet un bon en brouillon pour validation' })
  submitForValidation(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.submitForValidation(id, user.companyId);
  }

  @Patch(':id/validate')
  @Permissions('purchase-orders:update')
  @ApiOperation({ summary: 'Valide un bon en attente de validation' })
  validate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.validate(id, user.companyId, user.sub);
  }

  @Post(':id/send')
  @Permissions('purchase-orders:update')
  @ApiOperation({ summary: 'Envoie (ou renvoie) le bon de commande par e-mail au fournisseur' })
  sendToSupplier(@Param('id', ParseCuidPipe) id: string, @Body() dto: SendPurchaseOrderDto, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.sendToSupplier(id, user.companyId, user.sub, dto);
  }

  @Patch(':id/receive')
  @Permissions('purchase-orders:update')
  @ApiOperation({ summary: 'Marque le bon comme réceptionné et génère les entrées de stock correspondantes' })
  receive(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.purchaseOrdersService.receive(id, user.companyId, user.sub);
  }
}

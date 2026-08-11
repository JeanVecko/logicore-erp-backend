import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersRepository, PurchaseOrderWithRelations } from './purchase-orders.repository';
import { PurchaseOrderSendLogsRepository, PurchaseOrderSendLogWithRelations } from './purchase-order-send-log.repository';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { InventoryService } from '../inventory/inventory.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateFromAlertsDto } from './dto/create-from-alerts.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { SendPurchaseOrderDto } from './dto/send-purchase-order.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PurchaseOrdersRepository,
    private readonly sendLogRepository: PurchaseOrderSendLogsRepository,
    private readonly pdfService: PurchaseOrderPdfService,
    private readonly inventoryService: InventoryService,
    private readonly warehousesService: WarehousesService,
    private readonly suppliersService: SuppliersService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(companyId: string, query: QueryPurchaseOrdersDto): Promise<PaginatedResult<PurchaseOrderWithRelations>> {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<PurchaseOrderWithRelations> {
    const po = await this.repository.findById(id, companyId);
    if (!po) throw new NotFoundException('Bon de commande introuvable');
    return po;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `BC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * `dto.status === 'ISSUED'` uniquement pour l'appel interne de createFromAlerts (émission
   * instantanée, sans fournisseur, flux inchangé). Tout autre appel (création manuelle depuis
   * Achats) exige un fournisseur avec e-mail et démarre en BROUILLON.
   */
  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrderWithRelations> {
    await this.warehousesService.findById(dto.warehouseId, companyId);
    const isAutoIssued = dto.status === 'ISSUED';

    let supplierId: string | undefined;
    let supplierName = dto.supplierName;
    if (!isAutoIssued) {
      if (!dto.supplierId) {
        throw new BadRequestException('La sélection d\'un fournisseur est obligatoire pour créer un bon de commande.');
      }
      const supplier = await this.suppliersService.findById(dto.supplierId, companyId);
      if (!supplier.email) {
        throw new BadRequestException("Le fournisseur sélectionné doit avoir une adresse e-mail valide pour recevoir le bon de commande.");
      }
      supplierId = supplier.id;
      supplierName = supplier.name;
    }

    const ref = await this.generateRef(companyId);
    const totalAmount = dto.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const now = new Date();

    return this.repository.create(this.prisma, {
      company: { connect: { id: companyId } },
      warehouse: { connect: { id: dto.warehouseId } },
      ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
      ref,
      supplierName,
      status: isAutoIssued ? 'ISSUED' : 'DRAFT',
      totalAmount,
      purchaseConditions: dto.purchaseConditions,
      observations: dto.observations,
      ...(isAutoIssued ? { issuedAt: now } : {}),
      createdBy: { connect: { id: userId } },
      lines: {
        create: dto.lines.map((l) => ({
          product: { connect: { id: l.productId } },
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
    });
  }

  /**
   * Émission en un clic : reconstitue automatiquement une ligne par article en alerte
   * (rupture ou sous seuil) sur l'entrepôt donné, avec une quantité ramenant au seuil de réappro.
   */
  async createFromAlerts(companyId: string, userId: string, dto: CreateFromAlertsDto): Promise<PurchaseOrderWithRelations> {
    const warehouseId = dto.warehouseId ?? (await this.resolveDefaultWarehouse(companyId, userId));
    await this.warehousesService.findById(warehouseId, companyId);

    const alerts = await this.inventoryService.getAlerts(companyId);
    const relevant = alerts.filter((a) => a.warehouseId === warehouseId);

    if (relevant.length === 0) {
      throw new BadRequestException("Aucun article en alerte de seuil sur cet entrepôt : rien à commander.");
    }

    const lines = relevant.map((a) => ({
      productId: a.productId,
      quantity: Math.max(a.product.reorderPoint - a.quantity, 1),
      unitPrice: a.product.purchasePrice,
    }));

    return this.create(companyId, userId, { warehouseId, lines, status: 'ISSUED' });
  }

  private async resolveDefaultWarehouse(companyId: string, userId: string): Promise<string> {
    // Le magasinier est en général rattaché à un entrepôt (User.warehouseId) — sinon on retombe
    // sur le premier entrepôt de l'entreprise plutôt que d'échouer sèchement.
    const withUserWarehouse = await this.prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
    if (withUserWarehouse?.warehouseId) return withUserWarehouse.warehouseId;

    const first = await this.prisma.warehouse.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    if (!first) throw new BadRequestException('Aucun entrepôt configuré pour cette entreprise.');
    return first.id;
  }

  async submitForValidation(id: string, companyId: string): Promise<PurchaseOrderWithRelations> {
    const po = await this.findById(id, companyId);
    if (po.status !== 'DRAFT') {
      throw new ConflictException('Seul un bon en brouillon peut être soumis pour validation.');
    }
    return this.repository.update(id, { status: 'PENDING_VALIDATION' });
  }

  async validate(id: string, companyId: string, userId: string): Promise<PurchaseOrderWithRelations> {
    const po = await this.findById(id, companyId);
    if (po.status !== 'PENDING_VALIDATION') {
      throw new ConflictException('Seul un bon en attente de validation peut être validé.');
    }
    return this.repository.update(id, {
      status: 'VALIDATED',
      validatedBy: { connect: { id: userId } },
      validatedAt: new Date(),
    });
  }

  /**
   * Envoie le PDF du bon par e-mail au fournisseur. Le statut ne passe à SENT_TO_SUPPLIER
   * qu'après confirmation d'envoi réussie — en cas d'échec, le bon reste au statut précédent
   * et l'erreur est renvoyée telle quelle pour permettre un nouvel essai.
   */
  async sendToSupplier(id: string, companyId: string, userId: string, dto: SendPurchaseOrderDto): Promise<PurchaseOrderWithRelations> {
    const po = await this.findById(id, companyId);
    if (po.status !== 'VALIDATED' && po.status !== 'SENT_TO_SUPPLIER') {
      throw new ConflictException('Seul un bon de commande validé peut être envoyé au fournisseur.');
    }
    if (!po.supplierId) {
      throw new BadRequestException("Ce bon de commande n'a pas de fournisseur associé.");
    }
    const supplier = await this.suppliersService.findById(po.supplierId, companyId);
    if (!supplier.email) {
      throw new BadRequestException("Le fournisseur n'a plus d'adresse e-mail valide — mettez à jour sa fiche avant de renvoyer ce bon.");
    }

    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const pdfBuffer = await this.pdfService.generate(po, company, supplier);
    const subject = `Bon de commande ${po.ref}`;

    const result = await this.emailService.send({
      to: supplier.email,
      subject,
      text: dto.message || `Veuillez trouver ci-joint notre bon de commande ${po.ref}.`,
      attachments: [{ filename: `${po.ref}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    });

    await this.sendLogRepository.create({
      company: { connect: { id: companyId } },
      purchaseOrder: { connect: { id: po.id } },
      recipientEmail: supplier.email,
      subject,
      status: result.success ? 'SUCCESS' : 'FAILED',
      errorMessage: result.error,
      ...(userId ? { sentBy: { connect: { id: userId } } } : {}),
    });

    await this.auditService.record({
      companyId,
      userId,
      action: result.success ? 'PURCHASE_ORDER_EMAIL_SENT' : 'PURCHASE_ORDER_EMAIL_FAILED',
      entity: 'PurchaseOrder',
      entityId: po.id,
      metadata: { recipient: supplier.email, subject, error: result.error },
    });

    if (!result.success) {
      await this.notificationsService.notifyCompany(
        companyId,
        'PURCHASE_ORDER_SEND_FAILED',
        "Échec d'envoi du bon de commande",
        `L'envoi du bon ${po.ref} à ${supplier.email} a échoué : ${result.error}`,
        '/achats',
      );
      throw new BadRequestException(`L'envoi de l'e-mail a échoué (${result.error}). Le bon reste au statut ${po.status} — vous pouvez réessayer.`);
    }

    await this.notificationsService.notifyCompany(
      companyId,
      'PURCHASE_ORDER_SENT',
      'Bon de commande envoyé',
      `Le bon ${po.ref} a été envoyé à ${supplier.email}.`,
      '/achats',
    );

    return this.repository.update(id, { status: 'SENT_TO_SUPPLIER', sentAt: new Date() });
  }

  async getSendHistory(id: string, companyId: string): Promise<PurchaseOrderSendLogWithRelations[]> {
    await this.findById(id, companyId);
    return this.sendLogRepository.findByPurchaseOrder(id);
  }

  /** Régénère le PDF à la demande — utilisé pour la pièce jointe e-mail et pour le téléchargement manuel. */
  async generatePdf(id: string, companyId: string): Promise<Buffer> {
    const po = await this.findById(id, companyId);
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const supplier = po.supplierId ? await this.suppliersService.findById(po.supplierId, companyId) : null;
    return this.pdfService.generate(po, company, supplier);
  }

  async receive(id: string, companyId: string, userId: string): Promise<PurchaseOrderWithRelations> {
    const po = await this.findById(id, companyId);
    if (po.status === 'RECEIVED') {
      throw new ConflictException('Ce bon de commande a déjà été réceptionné.');
    }
    if (po.status !== 'ISSUED' && po.status !== 'SENT_TO_SUPPLIER') {
      throw new ConflictException('Seul un bon émis (alertes) ou envoyé au fournisseur peut être réceptionné.');
    }

    // Chaque ligne génère un vrai mouvement d'entrée (réutilise la validation/transaction de StockMovementsService).
    for (const line of po.lines) {
      await this.stockMovementsService.create(companyId, userId, {
        productId: line.productId,
        warehouseId: po.warehouseId,
        type: 'ENTRY',
        quantity: line.quantity,
        reference: po.ref,
        notes: `Réception du bon de commande ${po.ref}`,
      });
    }

    return this.repository.markReceived(id);
  }
}

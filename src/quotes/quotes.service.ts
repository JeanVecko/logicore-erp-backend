import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotesRepository, QuoteWithRelations } from './quotes.repository';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';
import { SaleWithRelations } from '../sales/sales.repository';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

function computeTotal(lines: Array<{ quantity: number; unitPrice: number; discount?: number }>): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice - (l.discount ?? 0), 0);
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: QuotesRepository,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly salesService: SalesService,
  ) {}

  async findAll(companyId: string, query: QueryQuotesDto): Promise<PaginatedResult<QuoteWithRelations>> {
    const where = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? { ref: { contains: query.search } } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<QuoteWithRelations> {
    const quote = await this.repository.findById(id, companyId);
    if (!quote) throw new NotFoundException('Devis introuvable');
    return quote;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateQuoteDto): Promise<QuoteWithRelations> {
    await this.customersService.findById(dto.customerId, companyId);
    for (const line of dto.lines) {
      await this.productsService.findById(line.productId, companyId);
    }

    const ref = await this.generateRef(companyId);
    return this.repository.create({
      company: { connect: { id: companyId } },
      customer: { connect: { id: dto.customerId } },
      ref,
      status: 'DRAFT',
      totalAmount: computeTotal(dto.lines),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
      lines: {
        create: dto.lines.map((l) => ({
          product: { connect: { id: l.productId } },
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount ?? 0,
        })),
      },
    });
  }

  async update(id: string, companyId: string, dto: UpdateQuoteDto): Promise<QuoteWithRelations> {
    const quote = await this.findById(id, companyId);
    if (quote.status !== 'DRAFT' && quote.status !== 'SENT') {
      throw new ConflictException('Seul un devis en brouillon ou envoyé peut être modifié.');
    }
    if (dto.customerId) await this.customersService.findById(dto.customerId, companyId);

    if (dto.customerId || dto.validUntil !== undefined) {
      await this.repository.update(id, {
        ...(dto.customerId ? { customer: { connect: { id: dto.customerId } } } : {}),
        ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
      });
    }

    if (dto.lines) {
      for (const line of dto.lines) {
        await this.productsService.findById(line.productId, companyId);
      }
      await this.repository.replaceLines(
        id,
        dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount ?? 0 })),
      );
      await this.repository.update(id, { totalAmount: computeTotal(dto.lines) });
    }

    return this.findById(id, companyId);
  }

  async send(id: string, companyId: string): Promise<QuoteWithRelations> {
    const quote = await this.findById(id, companyId);
    if (quote.status !== 'DRAFT') {
      throw new ConflictException('Seul un devis en brouillon peut être envoyé.');
    }
    return this.repository.update(id, { status: 'SENT' });
  }

  async accept(id: string, companyId: string): Promise<QuoteWithRelations> {
    const quote = await this.findById(id, companyId);
    if (quote.status !== 'SENT') {
      throw new ConflictException('Seul un devis envoyé peut être accepté.');
    }
    return this.repository.update(id, { status: 'ACCEPTED' });
  }

  async reject(id: string, companyId: string): Promise<QuoteWithRelations> {
    const quote = await this.findById(id, companyId);
    if (quote.status !== 'SENT') {
      throw new ConflictException('Seul un devis envoyé peut être refusé.');
    }
    return this.repository.update(id, { status: 'REJECTED' });
  }

  /** Transforme un devis accepté en vente (DRAFT), en réutilisant SalesService.create() plutôt qu'en dupliquant le calcul du total/de la référence. */
  async convert(id: string, companyId: string, userId: string): Promise<SaleWithRelations> {
    const quote = await this.findById(id, companyId);
    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException('Seul un devis accepté peut être converti en vente.');
    }

    const sale = await this.salesService.create(companyId, userId, {
      customerId: quote.customerId,
      customerName: quote.customer.name,
      warehouseId: await this.resolveDefaultWarehouse(companyId, userId),
      notes: `Converti depuis le devis ${quote.ref}`,
      lines: quote.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })),
    });

    await this.repository.update(id, { status: 'CONVERTED', convertedSaleId: sale.id });
    return sale;
  }

  private async resolveDefaultWarehouse(companyId: string, userId: string): Promise<string> {
    // Un devis n'a pas de dépôt propre — on retombe sur le dépôt de l'utilisateur, sinon le premier
    // de l'entreprise, comme PurchaseOrdersService.resolveDefaultWarehouse le fait déjà pour les BC auto.
    const withUserWarehouse = await this.prisma.user.findUnique({ where: { id: userId }, select: { warehouseId: true } });
    if (withUserWarehouse?.warehouseId) return withUserWarehouse.warehouseId;

    const first = await this.prisma.warehouse.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    if (!first) throw new BadRequestException('Aucun entrepôt configuré pour cette entreprise.');
    return first.id;
  }
}

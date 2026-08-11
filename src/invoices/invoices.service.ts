import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoicesRepository, InvoiceWithRelations } from './invoices.repository';
import { SalesService } from '../sales/sales.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly repository: InvoicesRepository,
    private readonly salesService: SalesService,
  ) {}

  async findAll(companyId: string, query: QueryInvoicesDto): Promise<PaginatedResult<InvoiceWithRelations>> {
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

  async findById(id: string, companyId: string): Promise<InvoiceWithRelations> {
    const invoice = await this.repository.findById(id, companyId);
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `FAC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateInvoiceDto): Promise<InvoiceWithRelations> {
    const sale = await this.salesService.findById(dto.saleId, companyId);
    if (sale.status !== 'VALIDATED') {
      throw new ConflictException('Seule une vente validée peut être facturée.');
    }
    const existing = await this.repository.findBySaleId(sale.id);
    if (existing) {
      throw new ConflictException(`Cette vente a déjà une facture (${existing.ref}).`);
    }

    const ref = await this.generateRef(companyId);
    return this.repository.create({
      company: { connect: { id: companyId } },
      sale: { connect: { id: sale.id } },
      ...(sale.customerId ? { customer: { connect: { id: sale.customerId } } } : {}),
      customerName: sale.customerName,
      ref,
      status: 'UNPAID',
      totalAmount: sale.totalAmount,
      amountPaid: 0,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
    });
  }
}

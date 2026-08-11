import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryNotesRepository, DeliveryNoteWithRelations } from './delivery-notes.repository';
import { SalesService } from '../sales/sales.service';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { QueryDeliveryNotesDto } from './dto/query-delivery-notes.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class DeliveryNotesService {
  constructor(
    private readonly repository: DeliveryNotesRepository,
    private readonly salesService: SalesService,
  ) {}

  async findAll(companyId: string, query: QueryDeliveryNotesDto): Promise<PaginatedResult<DeliveryNoteWithRelations>> {
    const where = { companyId, ...(query.status ? { status: query.status } : {}) };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<DeliveryNoteWithRelations> {
    const note = await this.repository.findById(id, companyId);
    if (!note) throw new NotFoundException('Bon de livraison introuvable');
    return note;
  }

  private async generateRef(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repository.countThisYear(companyId, year);
    return `BL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateDeliveryNoteDto): Promise<DeliveryNoteWithRelations> {
    const sale = await this.salesService.findById(dto.saleId, companyId);
    if (sale.status !== 'VALIDATED') {
      throw new ConflictException('Seule une vente validée peut générer un bon de livraison.');
    }
    const existing = await this.repository.findBySaleId(sale.id);
    if (existing) {
      throw new ConflictException(`Cette vente a déjà un bon de livraison (${existing.ref}).`);
    }

    const ref = await this.generateRef(companyId);
    return this.repository.create({
      company: { connect: { id: companyId } },
      sale: { connect: { id: sale.id } },
      ref,
      status: 'PREPARING',
      ...(userId ? { createdBy: { connect: { id: userId } } } : {}),
    });
  }

  async markDelivered(id: string, companyId: string): Promise<DeliveryNoteWithRelations> {
    const note = await this.findById(id, companyId);
    if (note.status === 'DELIVERED') {
      throw new ConflictException('Ce bon de livraison est déjà marqué comme livré.');
    }
    return this.repository.update(id, { status: 'DELIVERED', deliveredAt: new Date() });
  }
}

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsRepository, PaymentWithRelations } from './payments.repository';
import { InvoicesRepository } from '../invoices/invoices.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: PaymentsRepository,
    private readonly invoicesRepository: InvoicesRepository,
  ) {}

  async findAll(companyId: string, query: QueryPaymentsDto): Promise<PaginatedResult<PaymentWithRelations>> {
    const where = { companyId, ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}) };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  /**
   * Enregistre un paiement et met à jour le solde/statut de la facture dans la même transaction
   * (relecture fraîche d'amountPaid en tx pour rester correct si deux paiements arrivent en concurrence
   * sur la même facture).
   */
  async create(companyId: string, userId: string, dto: CreatePaymentDto): Promise<PaymentWithRelations> {
    const createdId = await this.prisma.$transaction(async (tx) => {
      const invoice = await this.invoicesRepository.findByIdInTx(tx, dto.invoiceId, companyId);
      if (!invoice) {
        throw new BadRequestException('Facture introuvable');
      }
      if (invoice.status === 'PAID') {
        throw new ConflictException('Cette facture est déjà intégralement payée.');
      }
      const newAmountPaid = invoice.amountPaid + dto.amount;
      if (newAmountPaid > invoice.totalAmount) {
        throw new BadRequestException(
          `Le paiement dépasse le solde restant dû (${(invoice.totalAmount - invoice.amountPaid).toFixed(2)}).`,
        );
      }

      const payment = await this.repository.createInTx(tx, {
        company: { connect: { id: companyId } },
        invoice: { connect: { id: invoice.id } },
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        ...(userId ? { receivedBy: { connect: { id: userId } } } : {}),
      });

      await this.invoicesRepository.updateInTx(tx, invoice.id, {
        amountPaid: newAmountPaid,
        status: newAmountPaid >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID',
      });

      return payment.id;
    });

    const payment = await this.repository.findById(createdId);
    if (!payment) throw new BadRequestException('Erreur lors de la création du paiement.');
    return payment;
  }
}

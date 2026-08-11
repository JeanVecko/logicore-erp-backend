import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const paymentInclude = Prisma.validator<Prisma.PaymentInclude>()({
  invoice: { include: { customer: true } },
  receivedBy: { select: { id: true, firstName: true, lastName: true } },
});
export type PaymentWithRelations = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

type PrismaLike = Pick<PrismaService, 'payment'>;

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.PaymentWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<PaymentWithRelations[]> {
    return this.prisma.payment.findMany({ where, skip, take, include: paymentInclude, orderBy: { paidAt: sortDir } });
  }

  count(where: Prisma.PaymentWhereInput): Promise<number> {
    return this.prisma.payment.count({ where });
  }

  findById(id: string): Promise<PaymentWithRelations | null> {
    return this.prisma.payment.findUnique({ where: { id }, include: paymentInclude });
  }

  createInTx(client: PrismaLike, data: Prisma.PaymentCreateInput) {
    return client.payment.create({ data });
  }
}

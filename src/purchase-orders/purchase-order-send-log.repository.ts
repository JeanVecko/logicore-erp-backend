import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const sendLogInclude = Prisma.validator<Prisma.PurchaseOrderSendLogInclude>()({
  sentBy: { select: { id: true, firstName: true, lastName: true } },
});
export type PurchaseOrderSendLogWithRelations = Prisma.PurchaseOrderSendLogGetPayload<{ include: typeof sendLogInclude }>;

@Injectable()
export class PurchaseOrderSendLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PurchaseOrderSendLogCreateInput): Promise<PurchaseOrderSendLogWithRelations> {
    return this.prisma.purchaseOrderSendLog.create({ data, include: sendLogInclude });
  }

  findByPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderSendLogWithRelations[]> {
    return this.prisma.purchaseOrderSendLog.findMany({
      where: { purchaseOrderId },
      include: sendLogInclude,
      orderBy: { sentAt: 'desc' },
    });
  }
}

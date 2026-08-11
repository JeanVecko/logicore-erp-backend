import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const deliveryNoteInclude = Prisma.validator<Prisma.DeliveryNoteInclude>()({
  sale: { include: { customer: true, warehouse: true, lines: { include: { product: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
});
export type DeliveryNoteWithRelations = Prisma.DeliveryNoteGetPayload<{ include: typeof deliveryNoteInclude }>;

@Injectable()
export class DeliveryNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.DeliveryNoteWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<DeliveryNoteWithRelations[]> {
    return this.prisma.deliveryNote.findMany({ where, skip, take, include: deliveryNoteInclude, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.DeliveryNoteWhereInput): Promise<number> {
    return this.prisma.deliveryNote.count({ where });
  }

  findById(id: string, companyId: string): Promise<DeliveryNoteWithRelations | null> {
    return this.prisma.deliveryNote.findFirst({ where: { id, companyId }, include: deliveryNoteInclude });
  }

  findBySaleId(saleId: string): Promise<DeliveryNoteWithRelations | null> {
    return this.prisma.deliveryNote.findUnique({ where: { saleId }, include: deliveryNoteInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.deliveryNote.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(data: Prisma.DeliveryNoteCreateInput): Promise<DeliveryNoteWithRelations> {
    return this.prisma.deliveryNote.create({ data, include: deliveryNoteInclude });
  }

  update(id: string, data: Prisma.DeliveryNoteUpdateInput): Promise<DeliveryNoteWithRelations> {
    return this.prisma.deliveryNote.update({ where: { id }, data, include: deliveryNoteInclude });
  }
}

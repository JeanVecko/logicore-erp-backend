import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const campaignInclude = Prisma.validator<Prisma.InventoryCampaignInclude>()({
  warehouse: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
});
export type InventoryCampaignWithRelations = Prisma.InventoryCampaignGetPayload<{ include: typeof campaignInclude }>;

@Injectable()
export class InventoryCampaignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    where: Prisma.InventoryCampaignWhereInput,
    skip = 0,
    take = 20,
    sortDir: 'asc' | 'desc' = 'desc',
  ): Promise<InventoryCampaignWithRelations[]> {
    return this.prisma.inventoryCampaign.findMany({ where, skip, take, include: campaignInclude, orderBy: { scheduledDate: sortDir } });
  }

  count(where: Prisma.InventoryCampaignWhereInput): Promise<number> {
    return this.prisma.inventoryCampaign.count({ where });
  }

  findById(id: string, companyId: string): Promise<InventoryCampaignWithRelations | null> {
    return this.prisma.inventoryCampaign.findFirst({ where: { id, companyId }, include: campaignInclude });
  }

  async countThisYear(companyId: string, year: number): Promise<number> {
    return this.prisma.inventoryCampaign.count({
      where: { companyId, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });
  }

  create(data: Prisma.InventoryCampaignCreateInput): Promise<InventoryCampaignWithRelations> {
    return this.prisma.inventoryCampaign.create({ data, include: campaignInclude });
  }

  update(id: string, data: Prisma.InventoryCampaignUpdateInput): Promise<InventoryCampaignWithRelations> {
    return this.prisma.inventoryCampaign.update({ where: { id }, data, include: campaignInclude });
  }

  delete(id: string): Promise<InventoryCampaignWithRelations> {
    return this.prisma.inventoryCampaign.delete({ where: { id }, include: campaignInclude });
  }
}

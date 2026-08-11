import { Injectable } from '@nestjs/common';
import { Asset, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const assetWithWarehouse = Prisma.validator<Prisma.AssetInclude>()({ warehouse: true });
export type AssetWithWarehouse = Prisma.AssetGetPayload<{ include: typeof assetWithWarehouse }>;

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.AssetWhereInput, skip = 0, take = 20): Promise<AssetWithWarehouse[]> {
    return this.prisma.asset.findMany({ where, skip, take, include: assetWithWarehouse, orderBy: { name: 'asc' } });
  }

  count(where: Prisma.AssetWhereInput): Promise<number> {
    return this.prisma.asset.count({ where });
  }

  findById(id: string, companyId: string): Promise<AssetWithWarehouse | null> {
    return this.prisma.asset.findFirst({ where: { id, companyId }, include: assetWithWarehouse });
  }

  findBySerialNumber(serialNumber: string, companyId: string): Promise<Asset | null> {
    return this.prisma.asset.findUnique({ where: { companyId_serialNumber: { companyId, serialNumber } } });
  }

  create(data: Prisma.AssetCreateInput): Promise<AssetWithWarehouse> {
    return this.prisma.asset.create({ data, include: assetWithWarehouse });
  }

  update(id: string, data: Prisma.AssetUpdateInput): Promise<AssetWithWarehouse> {
    return this.prisma.asset.update({ where: { id }, data, include: assetWithWarehouse });
  }

  deactivate(id: string): Promise<AssetWithWarehouse> {
    return this.prisma.asset.update({ where: { id }, data: { isActive: false }, include: assetWithWarehouse });
  }
}

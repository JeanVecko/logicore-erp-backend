import { Injectable } from '@nestjs/common';
import { Prisma, Warehouse } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WarehousesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.WarehouseWhereInput, skip = 0, take = 20): Promise<Warehouse[]> {
    return this.prisma.warehouse.findMany({ where, skip, take, orderBy: { name: 'asc' } });
  }

  count(where: Prisma.WarehouseWhereInput): Promise<number> {
    return this.prisma.warehouse.count({ where });
  }

  findById(id: string, companyId: string): Promise<Warehouse | null> {
    return this.prisma.warehouse.findFirst({ where: { id, companyId } });
  }

  create(data: Prisma.WarehouseCreateInput): Promise<Warehouse> {
    return this.prisma.warehouse.create({ data });
  }

  update(id: string, data: Prisma.WarehouseUpdateInput): Promise<Warehouse> {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Warehouse> {
    return this.prisma.warehouse.update({ where: { id }, data: { isActive: false } });
  }
}

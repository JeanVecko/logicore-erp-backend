import { Injectable } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.SupplierWhereInput, skip = 0, take = 20): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({ where, skip, take, orderBy: { name: 'asc' } });
  }

  count(where: Prisma.SupplierWhereInput): Promise<number> {
    return this.prisma.supplier.count({ where });
  }

  findById(id: string, companyId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({ where: { id, companyId } });
  }

  findByName(name: string, companyId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({ where: { companyId_name: { companyId, name } } });
  }

  create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    return this.prisma.supplier.create({ data });
  }

  update(id: string, data: Prisma.SupplierUpdateInput): Promise<Supplier> {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Supplier> {
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}

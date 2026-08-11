import { Injectable } from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.ProductTypeWhereInput, skip = 0, take = 20): Promise<ProductType[]> {
    return this.prisma.productType.findMany({ where, skip, take, orderBy: { name: 'asc' } });
  }

  count(where: Prisma.ProductTypeWhereInput): Promise<number> {
    return this.prisma.productType.count({ where });
  }

  findById(id: string, companyId: string): Promise<ProductType | null> {
    return this.prisma.productType.findFirst({ where: { id, companyId } });
  }

  findByCode(companyId: string, categoryId: string, code: string): Promise<ProductType | null> {
    return this.prisma.productType.findUnique({ where: { companyId_categoryId_code: { companyId, categoryId, code } } });
  }

  create(data: Prisma.ProductTypeCreateInput): Promise<ProductType> {
    return this.prisma.productType.create({ data });
  }

  update(id: string, data: Prisma.ProductTypeUpdateInput): Promise<ProductType> {
    return this.prisma.productType.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<ProductType> {
    return this.prisma.productType.update({ where: { id }, data: { isActive: false } });
  }

  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { typeId: id } });
  }
}

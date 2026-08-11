import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const productWithCategory = Prisma.validator<Prisma.ProductInclude>()({ category: true });
export type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productWithCategory }>;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.ProductWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc'): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({ where, skip, take, include: productWithCategory, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.ProductWhereInput): Promise<number> {
    return this.prisma.product.count({ where });
  }

  findById(id: string, companyId: string): Promise<ProductWithCategory | null> {
    return this.prisma.product.findFirst({ where: { id, companyId }, include: productWithCategory });
  }

  findBySku(sku: string, companyId: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { companyId_sku: { companyId, sku } } });
  }

  create(data: Prisma.ProductCreateInput): Promise<ProductWithCategory> {
    return this.prisma.product.create({ data, include: productWithCategory });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<ProductWithCategory> {
    return this.prisma.product.update({ where: { id }, data, include: productWithCategory });
  }

  deactivate(id: string): Promise<ProductWithCategory> {
    return this.prisma.product.update({ where: { id }, data: { isActive: false }, include: productWithCategory });
  }
}

import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.CategoryWhereInput, skip = 0, take = 20): Promise<Category[]> {
    return this.prisma.category.findMany({ where, skip, take, orderBy: { name: 'asc' } });
  }

  count(where: Prisma.CategoryWhereInput): Promise<number> {
    return this.prisma.category.count({ where });
  }

  findById(id: string, companyId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id, companyId } });
  }

  findByCode(companyId: string, code: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { companyId_code: { companyId, code } } });
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { categoryId: id } });
  }
}

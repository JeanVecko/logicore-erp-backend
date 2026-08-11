import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  async findAll(companyId: string, query: PaginationQueryDto): Promise<PaginatedResult<Category>> {
    const where = { companyId, isActive: true, ...(query.search ? { name: { contains: query.search } } : {}) };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<Category> {
    const category = await this.repository.findById(id, companyId);
    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }
    return category;
  }

  async create(companyId: string, dto: CreateCategoryDto): Promise<Category> {
    const existingCode = await this.repository.findByCode(companyId, dto.code);
    if (existingCode) {
      throw new ConflictException(`Le code "${dto.code}" est déjà utilisé par une autre catégorie de votre entreprise`);
    }
    return this.repository.create({ ...dto, company: { connect: { id: companyId } } });
  }

  async update(id: string, companyId: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findById(id, companyId);
    if (dto.code) {
      const existingCode = await this.repository.findByCode(companyId, dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Le code "${dto.code}" est déjà utilisé par une autre catégorie de votre entreprise`);
      }
    }
    return this.repository.update(id, dto);
  }

  async deactivate(id: string, companyId: string): Promise<Category> {
    await this.findById(id, companyId);
    const productCount = await this.repository.countProducts(id);
    if (productCount > 0) {
      throw new ConflictException(
        `Impossible de désactiver : ${productCount} article(s) rattaché(s) à cette catégorie.`,
      );
    }
    return this.repository.deactivate(id);
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { ProductTypesRepository } from './product-types.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { QueryProductTypesDto } from './dto/query-product-types.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ProductTypesService {
  constructor(
    private readonly repository: ProductTypesRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async findAll(companyId: string, query: QueryProductTypesDto): Promise<PaginatedResult<ProductType>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<ProductType> {
    const type = await this.repository.findById(id, companyId);
    if (!type) throw new NotFoundException('Type de matériel introuvable');
    return type;
  }

  async create(companyId: string, dto: CreateProductTypeDto): Promise<ProductType> {
    await this.assertCategoryBelongsToCompany(dto.categoryId, companyId);

    const existingCode = await this.repository.findByCode(companyId, dto.categoryId, dto.code);
    if (existingCode) {
      throw new ConflictException(`Le code "${dto.code}" est déjà utilisé par un autre type dans cette catégorie`);
    }

    return this.repository.create({
      company: { connect: { id: companyId } },
      category: { connect: { id: dto.categoryId } },
      name: dto.name,
      code: dto.code,
    });
  }

  async update(id: string, companyId: string, dto: UpdateProductTypeDto): Promise<ProductType> {
    const existing = await this.findById(id, companyId);

    const categoryId = dto.categoryId ?? existing.categoryId;
    if (dto.categoryId) {
      await this.assertCategoryBelongsToCompany(dto.categoryId, companyId);
    }
    if (dto.code) {
      const existingCode = await this.repository.findByCode(companyId, categoryId, dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`Le code "${dto.code}" est déjà utilisé par un autre type dans cette catégorie`);
      }
    }

    const { categoryId: dtoCategoryId, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(dtoCategoryId ? { category: { connect: { id: dtoCategoryId } } } : {}),
    });
  }

  async deactivate(id: string, companyId: string): Promise<ProductType> {
    await this.findById(id, companyId);
    const productCount = await this.repository.countProducts(id);
    if (productCount > 0) {
      throw new ConflictException(`Impossible de désactiver : ${productCount} article(s) rattaché(s) à ce type.`);
    }
    return this.repository.deactivate(id);
  }

  /**
   * Aperçu de la prochaine référence, SANS réserver le numéro (contrairement à la création
   * d'article, qui incrémente réellement le compteur dans une transaction atomique). Affiché
   * dans le formulaire pour indication seulement — un léger décalage est possible si un autre
   * article est créé entre l'aperçu et la validation, la référence réellement attribuée à la
   * création reste, elle, garantie sans doublon.
   */
  async previewNextSku(id: string, companyId: string): Promise<string> {
    const type = await this.findById(id, companyId);
    const category = await this.categoriesRepository.findById(type.categoryId, companyId);
    if (!category) throw new NotFoundException('Catégorie introuvable dans votre entreprise');
    return `${category.code}-${type.code}-${String(type.nextProductSeq).padStart(3, '0')}`;
  }

  private async assertCategoryBelongsToCompany(categoryId: string, companyId: string): Promise<void> {
    const category = await this.categoriesRepository.findById(categoryId, companyId);
    if (!category) {
      throw new NotFoundException('Catégorie introuvable dans votre entreprise');
    }
  }
}

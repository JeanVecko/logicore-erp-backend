import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma, ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsRepository, ProductWithCategory } from './products.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { ProductTypesRepository } from '../product-types/product-types.repository';
import { InventoryRepository } from '../inventory/inventory.repository';
import { WarehousesService } from '../warehouses/warehouses.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ImportProductsDto, ImportProductsResult } from './dto/import-products.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

const DEFAULT_UNITS = ['pièce', 'sac', 'bidon', 'tube', 'rouleau', 'boîte', 'barre', 'litre', 'kg', 'm', 'm³'];
const DEFAULT_CATEGORY_NAME = 'Divers';
const DEFAULT_TYPE_NAME = 'Général';

/** Au-delà des valeurs par défaut de Prisma (maxWait 2s / timeout 5s) pour absorber la mise en
 * file d'attente sous SQLite (writer unique) en dev, sans jamais affecter la correction du
 * compteur atomique. Sans impact en production PostgreSQL (verrouillage ligne natif). */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

/** Base d'un code dérivé d'un nom (3 lettres/chiffres, accents/espaces retirés) — utilisé pour
 * générer un code de catégorie ou de type quand l'import Excel les crée à la volée, sans qu'un
 * utilisateur ne puisse en saisir un manuellement. */
function baseCode(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 3) || 'GEN';
}

/** Génère un code unique (catégorie ou type) au sein de l'ensemble de codes déjà pris fourni. */
function generateUniqueCode(name: string, existingCodes: Set<string>): string {
  const base = baseCode(name);
  if (!existingCodes.has(base)) return base;
  let n = 2;
  let candidate = `${base}${n}`;
  while (existingCodes.has(candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly productTypesRepository: ProductTypesRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly warehousesService: WarehousesService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(companyId: string, query: QueryProductsDto): Promise<PaginatedResult<ProductWithCategory>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }] }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<ProductWithCategory> {
    const product = await this.repository.findById(id, companyId);
    if (!product) {
      throw new NotFoundException('Article introuvable');
    }
    return product;
  }

  /**
   * Crée l'article avec une référence générée par le système (jamais saisie par le client) :
   * CODE_CATÉGORIE-CODE_TYPE-NNN. Le numéro est un compteur atomique propre à la combinaison
   * catégorie+type (ProductType.nextProductSeq, incrémenté via une opération SQL atomique —
   * voir claimSku). Un type n'appartenant qu'à une seule catégorie, cela suffit à rendre le
   * compteur indépendant par combinaison catégorie+type sans clé composite supplémentaire.
   */
  async create(companyId: string, dto: CreateProductDto): Promise<ProductWithCategory> {
    const category = await this.getCategoryOrThrow(dto.categoryId, companyId);
    const type = await this.getTypeOrThrow(dto.typeId, companyId, dto.categoryId);

    // maxWait/timeout relevés au-delà des valeurs par défaut de Prisma (2s/5s) : en dev, SQLite
    // n'autorise qu'un seul writer à la fois, donc des créations concurrentes sur le même
    // type se mettent en file plutôt qu'en parallèle — à ne pas confondre avec un problème de
    // correction (le compteur reste atomique et sans doublon). PostgreSQL en production n'a
    // pas cette limite (verrouillage au niveau ligne, écritures concurrentes natives).
    return this.prisma.$transaction(async (tx) => {
      const sku = await this.claimSku(tx, category, type);
      const { categoryId, typeId, ...rest } = dto;
      return tx.product.create({
        data: {
          ...rest,
          sku,
          company: { connect: { id: companyId } },
          category: { connect: { id: categoryId } },
          type: { connect: { id: typeId } },
        },
        include: { category: true },
      });
    }, TRANSACTION_OPTIONS);
  }

  async update(id: string, companyId: string, dto: UpdateProductDto): Promise<ProductWithCategory> {
    const existing = await this.findById(id, companyId);
    const effectiveCategoryId = dto.categoryId ?? existing.categoryId;

    if (dto.categoryId) {
      await this.getCategoryOrThrow(dto.categoryId, companyId);
    }

    if (dto.typeId) {
      await this.getTypeOrThrow(dto.typeId, companyId, effectiveCategoryId);
    } else if (dto.categoryId && existing.typeId) {
      // La catégorie change sans nouveau type fourni : si le type actuel appartient à
      // l'ancienne catégorie, il faut en choisir un nouveau plutôt que de laisser une
      // incohérence (un type doit toujours appartenir à la catégorie de son article).
      const currentType = await this.productTypesRepository.findById(existing.typeId, companyId);
      if (currentType && currentType.categoryId !== dto.categoryId) {
        throw new BadRequestException(
          "Cet article a un type rattaché à l'ancienne catégorie — sélectionnez aussi un type de la nouvelle catégorie.",
        );
      }
    }

    // La référence n'est jamais modifiable ici, même en changeant de catégorie/type — elle
    // reste l'identifiant permanent attribué à la création, à l'image d'un numéro de facture.
    const { categoryId, typeId, ...rest } = dto;
    return this.repository.update(id, {
      ...rest,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      ...(typeId ? { type: { connect: { id: typeId } } } : {}),
    });
  }

  async deactivate(id: string, companyId: string): Promise<ProductWithCategory> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }

  /**
   * Import en masse (fichier Excel côté client) : crée les catégories et les types manquants à
   * la volée (avec un code auto-généré, l'utilisateur n'en saisit pas dans le fichier), génère
   * la référence de chaque article via le même compteur atomique que la création manuelle, et
   * saisit la quantité initiale via un vrai mouvement ENTRY. Chaque ligne est indépendante :
   * une ligne en erreur n'annule pas les autres.
   */
  async importProducts(companyId: string, userId: string, dto: ImportProductsDto): Promise<ImportProductsResult> {
    const hasQuantity = dto.rows.some((r) => (r.quantity ?? 0) > 0);
    if (hasQuantity) {
      if (!dto.warehouseId) {
        throw new BadRequestException('Un dépôt est requis pour saisir des quantités initiales');
      }
      await this.warehousesService.findById(dto.warehouseId, companyId);
    }

    const existingCategories = await this.categoriesRepository.findAll({ companyId }, 0, 100000);
    const categoryByName = new Map<string, Category>(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));
    const existingCategoryCodes = new Set(existingCategories.map((c) => c.code));

    const existingTypes = await this.productTypesRepository.findAll({ companyId }, 0, 100000);
    const typeByKey = new Map<string, ProductType>(existingTypes.map((t) => [`${t.categoryId}:${t.name.trim().toLowerCase()}`, t]));
    const typeCodesByCategory = new Map<string, Set<string>>();
    existingTypes.forEach((t) => {
      const set = typeCodesByCategory.get(t.categoryId) ?? new Set<string>();
      set.add(t.code);
      typeCodesByCategory.set(t.categoryId, set);
    });

    const result: ImportProductsResult = { created: 0, categoriesCreated: 0, typesCreated: 0, errors: [] };

    for (const [index, row] of dto.rows.entries()) {
      const rowNumber = index + 2; // +1 pour l'en-tête, +1 pour repasser en 1-indexé
      try {
        const name = row.name?.trim();
        if (!name) throw new Error('Nom manquant');

        const categoryName = (row.category?.trim() || DEFAULT_CATEGORY_NAME).slice(0, 60);
        const categoryKey = categoryName.toLowerCase();
        let category = categoryByName.get(categoryKey);
        if (!category) {
          const code = generateUniqueCode(categoryName, existingCategoryCodes);
          existingCategoryCodes.add(code);
          category = await this.categoriesRepository.create({
            company: { connect: { id: companyId } },
            name: categoryName,
            code,
          });
          categoryByName.set(categoryKey, category);
          result.categoriesCreated += 1;
        }

        const typeName = (row.type?.trim() || DEFAULT_TYPE_NAME).slice(0, 60);
        const typeKey = `${category.id}:${typeName.toLowerCase()}`;
        let type = typeByKey.get(typeKey);
        if (!type) {
          const codesForCategory = typeCodesByCategory.get(category.id) ?? new Set<string>();
          const code = generateUniqueCode(typeName, codesForCategory);
          codesForCategory.add(code);
          typeCodesByCategory.set(category.id, codesForCategory);
          type = await this.productTypesRepository.create({
            company: { connect: { id: companyId } },
            category: { connect: { id: category.id } },
            name: typeName,
            code,
          });
          typeByKey.set(typeKey, type);
          result.typesCreated += 1;
        }

        const unit = row.unit && DEFAULT_UNITS.includes(row.unit) ? row.unit : DEFAULT_UNITS[0];
        const quantity = Math.floor(row.quantity ?? 0);

        await this.prisma.$transaction(async (tx) => {
          const sku = await this.claimSku(tx, category!, type!);
          const product = await tx.product.create({
            data: {
              companyId,
              categoryId: category!.id,
              typeId: type!.id,
              sku,
              name,
              unit,
              purchasePrice: row.purchasePrice ?? 0,
              sellingPrice: row.sellingPrice ?? 0,
              reorderPoint: row.reorderPoint ?? 0,
            },
          });

          if (quantity > 0 && dto.warehouseId) {
            await this.inventoryRepository.applyDelta(tx, companyId, product.id, dto.warehouseId, quantity);
            await tx.stockMovement.create({
              data: {
                companyId,
                productId: product.id,
                warehouseId: dto.warehouseId,
                type: 'ENTRY',
                quantity,
                reference: 'IMPORT-EXCEL',
                notes: "Stock initial saisi via l'import Excel",
                ...(userId ? { performedById: userId } : {}),
              },
            });
          }
        }, TRANSACTION_OPTIONS);

        result.created += 1;
      } catch (err) {
        result.errors.push({ row: rowNumber, name: row.name || '(sans nom)', reason: err.message || 'Erreur inconnue' });
      }
    }

    return result;
  }

  /**
   * Réserve atomiquement le prochain numéro de séquence du type et construit la référence
   * CODE_CATÉGORIE-CODE_TYPE-NNN. `UPDATE ... SET nextProductSeq = nextProductSeq + 1` est une
   * opération SQL atomique par ligne : deux créations concurrentes sur le même type sont
   * sérialisées par le moteur de la base, chacune récupérant un numéro distinct — aucun verrou
   * applicatif ni risque de doublon, y compris sous forte concurrence.
   */
  private async claimSku(
    tx: Prisma.TransactionClient,
    category: Pick<Category, 'code'>,
    type: Pick<ProductType, 'id' | 'code'>,
  ): Promise<string> {
    const updated = await tx.productType.update({
      where: { id: type.id },
      data: { nextProductSeq: { increment: 1 } },
      select: { nextProductSeq: true },
    });
    const seq = updated.nextProductSeq - 1;
    return `${category.code}-${type.code}-${String(seq).padStart(3, '0')}`;
  }

  private async getCategoryOrThrow(categoryId: string, companyId: string): Promise<Category> {
    const category = await this.categoriesRepository.findById(categoryId, companyId);
    if (!category) {
      throw new NotFoundException('Catégorie introuvable dans votre entreprise');
    }
    return category;
  }

  private async getTypeOrThrow(typeId: string, companyId: string, categoryId: string): Promise<ProductType> {
    const type = await this.productTypesRepository.findById(typeId, companyId);
    if (!type) {
      throw new NotFoundException('Type de matériel introuvable dans votre entreprise');
    }
    if (type.categoryId !== categoryId) {
      throw new BadRequestException("Le type sélectionné n'appartient pas à la catégorie choisie");
    }
    return type;
  }
}

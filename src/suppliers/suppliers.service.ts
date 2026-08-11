import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Supplier } from '@prisma/client';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class SuppliersService {
  constructor(private readonly repository: SuppliersRepository) {}

  async findAll(companyId: string, query: QuerySuppliersDto): Promise<PaginatedResult<Supplier>> {
    const where = {
      companyId,
      isActive: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search } }, { email: { contains: query.search } }] }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<Supplier> {
    const supplier = await this.repository.findById(id, companyId);
    if (!supplier) {
      throw new NotFoundException('Fournisseur introuvable');
    }
    return supplier;
  }

  async create(companyId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const existing = await this.repository.findByName(dto.name, companyId);
    if (existing) {
      throw new ConflictException(`Un fournisseur nommé "${dto.name}" existe déjà dans votre entreprise`);
    }
    return this.repository.create({ ...dto, company: { connect: { id: companyId } } });
  }

  async update(id: string, companyId: string, dto: UpdateSupplierDto): Promise<Supplier> {
    await this.findById(id, companyId);

    if (dto.name) {
      const existing = await this.repository.findByName(dto.name, companyId);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Un fournisseur nommé "${dto.name}" existe déjà dans votre entreprise`);
      }
    }

    return this.repository.update(id, dto);
  }

  async deactivate(id: string, companyId: string): Promise<Supplier> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }
}

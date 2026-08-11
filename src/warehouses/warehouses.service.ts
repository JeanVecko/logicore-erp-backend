import { Injectable, NotFoundException } from '@nestjs/common';
import { Warehouse } from '@prisma/client';
import { WarehousesRepository } from './warehouses.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class WarehousesService {
  constructor(private readonly repository: WarehousesRepository) {}

  async findAll(companyId: string, query: PaginationQueryDto): Promise<PaginatedResult<Warehouse>> {
    const where = { companyId, ...(query.search ? { name: { contains: query.search } } : {}) };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<Warehouse> {
    const warehouse = await this.repository.findById(id, companyId);
    if (!warehouse) {
      throw new NotFoundException('Entrepôt introuvable');
    }
    return warehouse;
  }

  create(companyId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.repository.create({ ...dto, company: { connect: { id: companyId } } });
  }

  async update(id: string, companyId: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    await this.findById(id, companyId);
    return this.repository.update(id, dto);
  }

  async deactivate(id: string, companyId: string): Promise<Warehouse> {
    await this.findById(id, companyId);
    return this.repository.deactivate(id);
  }
}

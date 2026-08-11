import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class CustomersService {
  constructor(private readonly repository: CustomersRepository) {}

  async findAll(companyId: string, query: QueryCustomersDto): Promise<PaginatedResult<any>> {
    const where = {
      companyId,
      ...(query.search ? { name: { contains: query.search } } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit, query.sortDir ?? 'desc'),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string) {
    const customer = await this.repository.findById(id, companyId);
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }

  create(companyId: string, dto: CreateCustomerDto) {
    return this.repository.create({ ...dto, company: { connect: { id: companyId } } });
  }

  async update(id: string, companyId: string, dto: UpdateCustomerDto) {
    await this.findById(id, companyId);
    return this.repository.update(id, dto);
  }

  async deactivate(id: string, companyId: string): Promise<{ id: string }> {
    await this.findById(id, companyId);
    await this.repository.update(id, { isActive: false });
    return { id };
  }
}

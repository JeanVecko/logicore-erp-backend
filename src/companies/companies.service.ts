import { Injectable, NotFoundException } from '@nestjs/common';
import { Company } from '@prisma/client';
import { CompaniesRepository } from './companies.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';

export interface CompanyDirectoryEntry {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  accountType: string;
  createdAt: Date;
  adminName: string | null;
  adminEmail: string | null;
  userCount: number;
}

@Injectable()
export class CompaniesService {
  constructor(private readonly repository: CompaniesRepository) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<CompanyDirectoryEntry>> {
    const where = query.search ? { name: { contains: query.search } } : {};
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    const directory = items.map((c) => {
      const admin = c.users[0];
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        isActive: c.isActive,
        accountType: c.accountType,
        createdAt: c.createdAt,
        adminName: admin ? `${admin.firstName} ${admin.lastName}` : null,
        adminEmail: admin?.email ?? null,
        userCount: c._count.users,
      };
    });
    return buildPaginatedResult(directory, totalItems, query.page, query.limit);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.repository.findById(id);
    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }
    return company;
  }

  create(dto: CreateCompanyDto): Promise<Company> {
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    await this.findById(id);
    return this.repository.update(id, dto);
  }

  async deactivate(id: string): Promise<Company> {
    await this.findById(id);
    return this.repository.delete(id);
  }
}

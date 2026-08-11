import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IBaseRepository } from '../database/base.repository';

const companyWithAdmin = Prisma.validator<Prisma.CompanyInclude>()({
  _count: { select: { users: true } },
  users: {
    where: { role: { code: 'ADMIN' } },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: { firstName: true, lastName: true, email: true },
  },
});
export type CompanyWithAdmin = Prisma.CompanyGetPayload<{ include: typeof companyWithAdmin }>;

@Injectable()
export class CompaniesRepository
  implements IBaseRepository<Company, Prisma.CompanyCreateInput, Prisma.CompanyUpdateInput, Prisma.CompanyWhereInput>
{
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.CompanyWhereInput = {}, skip = 0, take = 20): Promise<CompanyWithAdmin[]> {
    return this.prisma.company.findMany({ where, skip, take, include: companyWithAdmin, orderBy: { createdAt: 'desc' } });
  }

  count(where: Prisma.CompanyWhereInput = {}): Promise<number> {
    return this.prisma.company.count({ where });
  }

  findById(id: string): Promise<Company | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  create(data: Prisma.CompanyCreateInput): Promise<Company> {
    return this.prisma.company.create({ data });
  }

  update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    return this.prisma.company.update({ where: { id }, data });
  }

  delete(id: string): Promise<Company> {
    return this.prisma.company.update({ where: { id }, data: { isActive: false } });
  }
}

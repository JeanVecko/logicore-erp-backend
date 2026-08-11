import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.CustomerWhereInput, skip = 0, take = 20, sortDir: 'asc' | 'desc' = 'desc') {
    return this.prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: sortDir } });
  }

  count(where: Prisma.CustomerWhereInput) {
    return this.prisma.customer.count({ where });
  }

  findById(id: string, companyId: string) {
    return this.prisma.customer.findFirst({ where: { id, companyId } });
  }

  create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({ data });
  }

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return this.prisma.customer.update({ where: { id }, data });
  }
}

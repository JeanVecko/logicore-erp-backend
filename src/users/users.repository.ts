import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const userWithRole = Prisma.validator<Prisma.UserInclude>()({ role: true });
export type UserWithRole = Prisma.UserGetPayload<{ include: typeof userWithRole }>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(where: Prisma.UserWhereInput, skip = 0, take = 20): Promise<UserWithRole[]> {
    return this.prisma.user.findMany({ where, skip, take, include: userWithRole, orderBy: { createdAt: 'desc' } });
  }

  count(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  findById(id: string, companyId: string): Promise<UserWithRole | null> {
    return this.prisma.user.findFirst({ where: { id, companyId }, include: userWithRole });
  }

  findByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({ where: { email }, include: userWithRole });
  }

  create(data: Prisma.UserCreateInput): Promise<UserWithRole> {
    return this.prisma.user.create({ data, include: userWithRole });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithRole> {
    return this.prisma.user.update({ where: { id }, data, include: userWithRole });
  }

  deactivate(id: string): Promise<UserWithRole> {
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, include: userWithRole });
  }

  hardDelete(id: string): Promise<UserWithRole> {
    return this.prisma.user.delete({ where: { id }, include: userWithRole });
  }
}

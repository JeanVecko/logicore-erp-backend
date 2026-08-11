import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const roleWithPermissions = Prisma.validator<Prisma.RoleInclude>()({
  permissions: { include: { permission: true } },
});
export type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleWithPermissions }>;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({ include: roleWithPermissions, orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({ where: { id }, include: roleWithPermissions });
  }

  findByCode(code: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findUnique({ where: { code }, include: roleWithPermissions });
  }
}

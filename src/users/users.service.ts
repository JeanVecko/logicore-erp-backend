import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersRepository, UserWithRole } from './users.repository';
import { RolesRepository } from '../roles/roles.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { buildPaginatedResult } from '../common/utils/pagination.util';
import { ROLE_CODES } from '../common/constants/roles.constant';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly config: ConfigService,
  ) {}

  async findAll(companyId: string, query: PaginationQueryDto): Promise<PaginatedResult<UserResponseDto>> {
    const where = {
      companyId,
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items.map(this.toDto), totalItems, query.page, query.limit);
  }

  async findById(id: string, companyId: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id, companyId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return this.toDto(user);
  }

  async create(companyId: string, dto: CreateUserDto): Promise<UserResponseDto> {
    // Le rôle Super Admin est réservé à la plateforme — ne doit jamais pouvoir être attribué
    // via cette création de compte "normale" (même par un Super Admin), pour éviter tout risque
    // de prolifération incontrôlée de comptes plateforme. Même règle appliquée côté invitations.
    if (dto.roleCode === ROLE_CODES.SUPER_ADMIN) {
      throw new ForbiddenException('Le rôle Super Admin ne peut pas être attribué via cette création.');
    }

    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet e-mail existe déjà');
    }

    const role = await this.rolesRepository.findByCode(dto.roleCode);
    if (!role) {
      throw new NotFoundException(`Rôle "${dto.roleCode}" introuvable`);
    }

    const saltRounds = this.config.get<number>('security.bcryptSaltRounds') as number;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.repository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      company: { connect: { id: companyId } },
      role: { connect: { id: role.id } },
      ...(dto.warehouseId ? { warehouse: { connect: { id: dto.warehouseId } } } : {}),
    });

    return this.toDto(user);
  }

  async update(id: string, companyId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findById(id, companyId);

    if (dto.roleCode === ROLE_CODES.SUPER_ADMIN) {
      throw new ForbiddenException('Le rôle Super Admin ne peut pas être attribué via cette mise à jour.');
    }

    let roleConnect = {};
    if (dto.roleCode) {
      const role = await this.rolesRepository.findByCode(dto.roleCode);
      if (!role) {
        throw new NotFoundException(`Rôle "${dto.roleCode}" introuvable`);
      }
      roleConnect = { role: { connect: { id: role.id } } };
    }

    const { roleCode: _roleCode, warehouseId, ...rest } = dto;
    const user = await this.repository.update(id, {
      ...rest,
      ...roleConnect,
      ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {}),
    });
    return this.toDto(user);
  }

  async deactivate(id: string, companyId: string): Promise<UserResponseDto> {
    await this.findById(id, companyId);
    const user = await this.repository.deactivate(id);
    return this.toDto(user);
  }

  private toDto(user: UserWithRole): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      companyId: user.companyId,
      warehouseId: user.warehouseId,
      roleCode: user.role.code,
      roleName: user.role.name,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}

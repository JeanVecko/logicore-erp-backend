import { Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { RoleResponseDto } from './dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private readonly repository: RolesRepository) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.repository.findAll();
    return roles.map(this.toDto);
  }

  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.repository.findById(id);
    if (!role) {
      throw new NotFoundException('Rôle introuvable');
    }
    return this.toDto(role);
  }

  private toDto = (role: Awaited<ReturnType<RolesRepository['findAll']>>[number]): RoleResponseDto => ({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.permissions.map((rp) => rp.permission.code),
  });
}

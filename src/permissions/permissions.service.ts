import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PermissionsRepository } from './permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly repository: PermissionsRepository) {}

  findAll(module?: string): Promise<Permission[]> {
    return module ? this.repository.findByModule(module) : this.repository.findAll();
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.repository.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission introuvable');
    }
    return permission;
  }
}

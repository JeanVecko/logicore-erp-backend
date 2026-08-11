import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '../constants/roles.constant';

export const ROLES_KEY = 'roles';

/** Restreint une route à une liste de rôles. Combinable avec @Permissions(). */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

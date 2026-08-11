import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleCode } from '../constants/roles.constant';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/** À combiner après JwtAuthGuard : lit @Roles(...) et compare au rôle porté par le JWT. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const hasRole = requiredRoles.includes(user.roleCode as RoleCode);
    if (!hasRole) {
      throw new ForbiddenException(`Rôle insuffisant. Rôles autorisés : ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}

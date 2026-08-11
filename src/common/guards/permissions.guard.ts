import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/** À combiner après JwtAuthGuard : lit @Permissions(...) et vérifie l'inclusion dans le JWT. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const userPermissions = new Set(user.permissions ?? []);
    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));
    if (!hasAll) {
      throw new ForbiddenException(`Permission(s) manquante(s) : ${requiredPermissions.join(', ')}`);
    }
    return true;
  }
}

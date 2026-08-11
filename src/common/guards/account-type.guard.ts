import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRES_ACCOUNT_TYPE_KEY } from '../decorators/requires-account-type.decorator';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * À combiner après PermissionsGuard : lit @RequiresAccountType(...) et vérifie Company.accountType
 * en base (pas depuis le JWT, contrairement à roleCode/permissions) — un changement de type de
 * compte par un Super Admin doit prendre effet immédiatement, sans attendre l'expiration du token.
 */
@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAccountTypes = this.reflector.getAllAndOverride<string[]>(REQUIRES_ACCOUNT_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredAccountTypes || requiredAccountTypes.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { accountType: true },
    });

    if (!company || !requiredAccountTypes.includes(company.accountType)) {
      throw new ForbiddenException("Ce module n'est pas activé pour votre organisation.");
    }
    return true;
  }
}

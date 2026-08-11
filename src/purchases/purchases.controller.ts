import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "purchases" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  @Get()
  @Permissions('purchases:read')
  @ApiOperation({ summary: 'Module purchases — endpoint à implémenter' })
  placeholder() {
    return { module: 'purchases', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

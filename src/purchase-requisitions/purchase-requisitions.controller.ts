import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "purchase-requisitions" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('PurchaseRequisitions')
@ApiBearerAuth()
@Controller('purchase-requisitions')
export class PurchaseRequisitionsController {
  @Get()
  @Permissions('purchase-requisitions:read')
  @ApiOperation({ summary: 'Module purchase-requisitions — endpoint à implémenter' })
  placeholder() {
    return { module: 'purchase-requisitions', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

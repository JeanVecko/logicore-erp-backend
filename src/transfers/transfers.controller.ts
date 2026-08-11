import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "transfers" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('Transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  @Get()
  @Permissions('transfers:read')
  @ApiOperation({ summary: 'Module transfers — endpoint à implémenter' })
  placeholder() {
    return { module: 'transfers', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

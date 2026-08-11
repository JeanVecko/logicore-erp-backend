import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "requests" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('Requests')
@ApiBearerAuth()
@Controller('requests')
export class RequestsController {
  @Get()
  @Permissions('requests:read')
  @ApiOperation({ summary: 'Module requests — endpoint à implémenter' })
  placeholder() {
    return { module: 'requests', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "reports" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  @Get()
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Module reports — endpoint à implémenter' })
  placeholder() {
    return { module: 'reports', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

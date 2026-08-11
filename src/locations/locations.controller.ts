import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * Module "locations" — scaffold prêt à être développé (Controller/Service/DTO/Repository).
 * Enregistré dans AppModule, protégé par JWT + RBAC, visible dans Swagger.
 */
@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  @Get()
  @Permissions('locations:read')
  @ApiOperation({ summary: 'Module locations — endpoint à implémenter' })
  placeholder() {
    return { module: 'locations', status: 'not_implemented', message: 'Module scaffoldé, logique métier à venir.' };
  }
}

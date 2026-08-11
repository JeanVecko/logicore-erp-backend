import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Liste mes notifications (personnelles + entreprise)' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.findAll(user.companyId, user.sub, query);
  }

  @Get('unread-count')
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.companyId, user.sub);
  }

  @Patch(':id/read')
  @Permissions('notifications:update')
  @ApiOperation({ summary: 'Marque une notification comme lue' })
  markRead(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markRead(id, user.companyId);
  }

  @Patch('read-all')
  @Permissions('notifications:update')
  @ApiOperation({ summary: 'Marque toutes mes notifications comme lues' })
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.companyId, user.sub);
  }
}

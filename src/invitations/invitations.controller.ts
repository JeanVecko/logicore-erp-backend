import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Get()
  @ApiBearerAuth()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Liste les invitations envoyées par mon entreprise' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId);
  }

  @Post()
  @ApiBearerAuth()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Invite une personne par e-mail à rejoindre mon entreprise avec un rôle donné' })
  create(@Body() dto: CreateInvitationDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, user.sub, dto);
  }

  @Patch(':id/resend')
  @ApiBearerAuth()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Renvoie une invitation (nouveau lien, nouvelle expiration)' })
  resend(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.resend(id, user.companyId);
  }

  @Patch(':id/revoke')
  @ApiBearerAuth()
  @Permissions('users:delete')
  @ApiOperation({ summary: 'Révoque une invitation en attente' })
  revoke(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.revoke(id, user.companyId);
  }

  @Public()
  @Get('preview')
  @ApiOperation({ summary: "Aperçu public d'une invitation (société, rôle) à partir du token, sans le consommer" })
  preview(@Query('token') token: string) {
    return this.service.previewByToken(token);
  }

  @Public()
  @Post('accept')
  @ApiOperation({ summary: 'Accepte une invitation : crée le compte et connecte directement la personne' })
  accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.service.accept(dto.token, dto, req.headers['user-agent'], req.ip);
  }
}

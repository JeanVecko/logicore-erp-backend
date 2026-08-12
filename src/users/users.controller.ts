import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ROLE_CODES } from '../common/constants/roles.constant';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users:read')
  @ApiOperation({ summary: 'Liste les utilisateurs de mon entreprise' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Crée un utilisateur dans mon entreprise' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('users:read')
  @ApiOperation({ summary: "Détail d'un utilisateur" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Met à jour un utilisateur' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.update(id, user.companyId, dto, user.sub);
  }

  @Delete(':id')
  @Permissions('users:delete')
  @ApiOperation({ summary: 'Désactive un utilisateur (suppression logique)' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.deactivate(id, user.companyId, user.sub);
  }

  @Delete(':id/permanent')
  @Roles(ROLE_CODES.SUPER_ADMIN)
  @Permissions('users:delete')
  @ApiOperation({ summary: 'Supprime définitivement un utilisateur déjà désactivé (irréversible)' })
  hardDelete(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.hardDelete(id, user.companyId, user.sub);
  }
}

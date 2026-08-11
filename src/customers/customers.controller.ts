import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Customers')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Permissions('customers:read')
  @ApiOperation({ summary: 'Liste des clients' })
  findAll(@Query() query: QueryCustomersDto, @CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.companyId, query);
  }

  @Post()
  @Permissions('customers:create')
  @ApiOperation({ summary: 'Crée un client' })
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(user.companyId, dto);
  }

  @Get(':id')
  @Permissions('customers:read')
  @ApiOperation({ summary: "Détail d'un client" })
  findOne(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findById(id, user.companyId);
  }

  @Patch(':id')
  @Permissions('customers:update')
  @ApiOperation({ summary: 'Met à jour un client' })
  update(@Param('id', ParseCuidPipe) id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Permissions('customers:delete')
  @ApiOperation({ summary: 'Désactive un client' })
  remove(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deactivate(id, user.companyId);
  }
}

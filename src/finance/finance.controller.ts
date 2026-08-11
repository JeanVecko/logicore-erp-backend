import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RequiresAccountType } from '../common/decorators/requires-account-type.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Finance')
@ApiBearerAuth()
@RequiresAccountType('LOGISTICS_SALES')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Permissions('invoices:read')
  @ApiOperation({ summary: 'KPIs financiers, tendance (14j), factures en retard, top créances, paiements récents' })
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.financeService.getSummary(user.companyId);
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CompaniesModule } from './companies/companies.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { AuditModule } from './audit/audit.module';
import { InvitationsModule } from './invitations/invitations.module';

import { LocationsModule } from './locations/locations.module';
import { InventoryModule } from './inventory/inventory.module';
import { InventoryCampaignsModule } from './inventory-campaigns/inventory-campaigns.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { ProductsModule } from './products/products.module';
import { ProductTypesModule } from './product-types/product-types.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseRequisitionsModule } from './purchase-requisitions/purchase-requisitions.module';
import { SalesModule } from './sales/sales.module';
import { TransfersModule } from './transfers/transfers.module';
import { RequestsModule } from './requests/requests.module';
import { AssetsModule } from './assets/assets.module';
import { FleetModule } from './fleet/fleet.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FinanceModule } from './finance/finance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';

import { QuotesModule } from './quotes/quotes.module';
import { DeliveryNotesModule } from './delivery-notes/delivery-notes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AccountTypeGuard } from './common/guards/account-type.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    // ── Infrastructure ────────────────────────────────────────────────────
    ConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('security.throttleTtl') as number) * 1000,
            limit: config.get<number>('security.throttleLimit') as number,
          },
        ],
      }),
    }),

    // ── Identité, RBAC, multi-tenant ────────────────────────────────────────
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CompaniesModule,
    WarehousesModule,
    AuditModule,
    InvitationsModule,

    // ── Modules métier (scaffoldés, architecture évolutive) ─────────────────
    LocationsModule,
    InventoryModule,
    InventoryCampaignsModule,
    StockMovementsModule,
    ProductsModule,
    ProductTypesModule,
    CategoriesModule,
    SuppliersModule,
    CustomersModule,
    PurchasesModule,
    PurchaseOrdersModule,
    PurchaseRequisitionsModule,
    SalesModule,
    QuotesModule,
    DeliveryNotesModule,
    InvoicesModule,
    PaymentsModule,
    TransfersModule,
    RequestsModule,
    AssetsModule,
    FleetModule,
    MaintenanceModule,
    ReportsModule,
    DashboardModule,
    FinanceModule,
    NotificationsModule,
    AiModule,
  ],
  providers: [
    // Ordre d'enregistrement : authentification JWT, puis RBAC (rôles), puis permissions fines, puis rate limiting.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: AccountTypeGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

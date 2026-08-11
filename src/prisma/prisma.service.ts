import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    // SQLite (dev uniquement, cf. schema.prisma) n'autorise qu'un seul writer à la fois par
    // défaut ; sans ce PRAGMA, des écritures concurrentes échouent immédiatement en SQLITE_BUSY
    // au lieu de patienter le temps que le writer précédent libère le verrou. Sans effet en
    // production (PostgreSQL, verrouillage au niveau ligne — cette PRAGMA n'existe pas côté PG).
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      // PRAGMA renvoie une ligne de résultat — $executeRaw (réservé aux requêtes sans résultat)
      // rejette ça côté SQLite, il faut passer par $queryRaw.
      await this.$queryRawUnsafe('PRAGMA busy_timeout = 30000;');
    }

    this.logger.log('Prisma connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Utilitaire pour les tests / seeds : nettoie toutes les tables (dev uniquement). */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase() is not allowed in production');
    }
    const tableNames = [
      'audit_logs',
      'email_verification_tokens',
      'password_reset_tokens',
      'refresh_tokens',
      'users',
      'role_permissions',
      'roles',
      'permissions',
      'warehouses',
      'currencies',
      'companies',
    ];
    for (const table of tableNames) {
      await this.$executeRawUnsafe(`DELETE FROM "${table}";`);
    }
  }
}

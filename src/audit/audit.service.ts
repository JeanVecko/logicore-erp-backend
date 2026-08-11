import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

export interface RecordAuditEntryInput {
  companyId?: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service transverse injectable par n'importe quel autre module pour tracer une action
 * (connexion, création/suppression sensible, changement de rôle...).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly repository: AuditRepository) {}

  async record(entry: RecordAuditEntryInput): Promise<void> {
    try {
      await this.repository.create({
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        ...(entry.companyId ? { company: { connect: { id: entry.companyId } } } : {}),
        ...(entry.userId ? { user: { connect: { id: entry.userId } } } : {}),
      });
    } catch (error) {
      // L'audit ne doit jamais faire échouer l'action métier qu'il journalise.
      this.logger.error(`Échec d'écriture de l'audit log (${entry.action})`, (error as Error).stack);
    }
  }

  async findAll(companyId: string, query: PaginationQueryDto & { action?: string; entity?: string; userId?: string }) {
    const where = {
      companyId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const [items, totalItems] = await Promise.all([
      this.repository.findAll(where, query.skip, query.limit),
      this.repository.count(where),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }
}

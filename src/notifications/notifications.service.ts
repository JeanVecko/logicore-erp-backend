import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { buildPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(companyId: string, userId: string, query: PaginationQueryDto) {
    const [items, totalItems] = await Promise.all([
      this.repository.findAllForUser(companyId, userId, query.skip, query.limit),
      this.repository.countForUser(companyId, userId),
    ]);
    return buildPaginatedResult(items, totalItems, query.page, query.limit);
  }

  async getUnreadCount(companyId: string, userId: string) {
    const count = await this.repository.countUnreadForUser(companyId, userId);
    return { count };
  }

  async markRead(id: string, companyId: string) {
    const notification = await this.repository.findById(id, companyId);
    if (!notification) throw new NotFoundException('Notification introuvable');
    return this.repository.markRead(id, companyId);
  }

  async markAllRead(companyId: string, userId: string) {
    const result = await this.repository.markAllReadForUser(companyId, userId);
    return { updated: result.count };
  }

  /** Notification "entreprise" (visible par tous) — utilisée pour les alertes de stock. */
  notifyCompany(companyId: string, type: string, title: string, message: string, link?: string) {
    return this.repository.create({
      company: { connect: { id: companyId } },
      type,
      title,
      message,
      link,
    });
  }
}

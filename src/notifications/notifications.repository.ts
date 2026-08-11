import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Notifications visibles par l'utilisateur : les siennes + celles de toute l'entreprise (userId null). */
  findAllForUser(companyId: string, userId: string, skip = 0, take = 20): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { companyId, OR: [{ userId }, { userId: null }] },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  countForUser(companyId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { companyId, OR: [{ userId }, { userId: null }] } });
  }

  countUnreadForUser(companyId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { companyId, isRead: false, OR: [{ userId }, { userId: null }] },
    });
  }

  create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  async markRead(id: string, companyId: string): Promise<Notification> {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  markAllReadForUser(companyId: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { companyId, isRead: false, OR: [{ userId }, { userId: null }] },
      data: { isRead: true },
    });
  }

  findById(id: string, companyId: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({ where: { id, companyId } });
  }
}

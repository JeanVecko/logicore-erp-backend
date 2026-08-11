import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const invitationInclude = Prisma.validator<Prisma.InvitationInclude>()({
  company: true,
  role: true,
  warehouse: true,
  invitedBy: { select: { id: true, firstName: true, lastName: true } },
});
export type InvitationWithRelations = Prisma.InvitationGetPayload<{ include: typeof invitationInclude }>;

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string): Promise<InvitationWithRelations[]> {
    return this.prisma.invitation.findMany({ where: { companyId }, include: invitationInclude, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string, companyId: string): Promise<InvitationWithRelations | null> {
    return this.prisma.invitation.findFirst({ where: { id, companyId }, include: invitationInclude });
  }

  findByTokenHash(tokenHash: string): Promise<InvitationWithRelations | null> {
    return this.prisma.invitation.findUnique({ where: { tokenHash }, include: invitationInclude });
  }

  findPendingByEmail(companyId: string, email: string): Promise<InvitationWithRelations | null> {
    return this.prisma.invitation.findFirst({ where: { companyId, email, status: 'PENDING' }, include: invitationInclude });
  }

  create(data: Prisma.InvitationCreateInput): Promise<InvitationWithRelations> {
    return this.prisma.invitation.create({ data, include: invitationInclude });
  }

  update(id: string, data: Prisma.InvitationUpdateInput): Promise<InvitationWithRelations> {
    return this.prisma.invitation.update({ where: { id }, data, include: invitationInclude });
  }
}

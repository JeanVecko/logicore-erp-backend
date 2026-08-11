import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsRepository, InvitationWithRelations } from './invitations.repository';
import { RolesRepository } from '../roles/roles.repository';
import { WarehousesService } from '../warehouses/warehouses.service';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { generateToken, hashToken } from '../common/utils/token.util';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: InvitationsRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly warehousesService: WarehousesService,
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  findAll(companyId: string): Promise<InvitationWithRelations[]> {
    return this.repository.findAll(companyId);
  }

  /** Le rôle Super Admin ne peut jamais être attribué par invitation, même par un Super Admin — même règle que UsersService.create/update. */
  async create(companyId: string, invitedById: string, dto: CreateInvitationDto): Promise<InvitationWithRelations> {
    if (dto.roleCode === ROLE_CODES.SUPER_ADMIN) {
      throw new ForbiddenException('Le rôle Super Admin ne peut pas être attribué par invitation.');
    }

    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet e-mail existe déjà.');
    }

    const existingInvitation = await this.repository.findPendingByEmail(companyId, dto.email);
    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      throw new ConflictException('Une invitation est déjà en attente pour cet e-mail — utilisez plutôt "Renvoyer".');
    }

    const role = await this.rolesRepository.findByCode(dto.roleCode);
    if (!role) {
      throw new NotFoundException(`Rôle "${dto.roleCode}" introuvable`);
    }
    if (dto.warehouseId) {
      await this.warehousesService.findById(dto.warehouseId, companyId);
    }

    const { raw, tokenHash, expiresAt } = this.mintToken();

    const invitation = await this.repository.create({
      company: { connect: { id: companyId } },
      email: dto.email,
      role: { connect: { id: role.id } },
      ...(dto.warehouseId ? { warehouse: { connect: { id: dto.warehouseId } } } : {}),
      tokenHash,
      status: 'PENDING',
      expiresAt,
      ...(invitedById ? { invitedBy: { connect: { id: invitedById } } } : {}),
    });

    await this.sendInvitationEmail(invitation, raw);

    return invitation;
  }

  async resend(id: string, companyId: string): Promise<InvitationWithRelations> {
    const invitation = await this.getOwned(id, companyId);
    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Seule une invitation en attente peut être renvoyée.');
    }

    const { raw, tokenHash, expiresAt } = this.mintToken();
    const updated = await this.repository.update(id, { tokenHash, expiresAt });
    await this.sendInvitationEmail(updated, raw);
    return updated;
  }

  async revoke(id: string, companyId: string): Promise<InvitationWithRelations> {
    const invitation = await this.getOwned(id, companyId);
    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('Cette invitation a déjà été acceptée.');
    }
    return this.repository.update(id, { status: 'REVOKED' });
  }

  async previewByToken(rawToken: string): Promise<{ companyName: string; roleName: string; email: string }> {
    const invitation = await this.loadValidByToken(rawToken);
    return { companyName: invitation.company.name, roleName: invitation.role.name, email: invitation.email };
  }

  /**
   * Crée le compte à partir de l'invitation puis connecte directement la personne — companyId/
   * roleId/warehouseId viennent uniquement de l'invitation stockée, jamais du corps de la requête
   * publique (même principe anti-tampering que companyId sur POST /users).
   */
  async accept(rawToken: string, dto: AcceptInvitationDto, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const invitation = await this.loadValidByToken(rawToken);

    const existingUser = await this.usersRepository.findByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const saltRounds = this.config.get<number>('security.bcryptSaltRounds') as number;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId: invitation.companyId,
          roleId: invitation.roleId,
          warehouseId: invitation.warehouseId ?? undefined,
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isEmailVerified: true, // l'acceptation via lien e-mail vaut vérification
        },
      });
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
      return created;
    });

    return this.authService.issueSessionForUser(user.id, userAgent, ipAddress);
  }

  private async getOwned(id: string, companyId: string): Promise<InvitationWithRelations> {
    const invitation = await this.repository.findById(id, companyId);
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    return invitation;
  }

  private async loadValidByToken(rawToken: string): Promise<InvitationWithRelations> {
    const tokenHash = hashToken(rawToken);
    const invitation = await this.repository.findByTokenHash(tokenHash);
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      throw new UnauthorizedException('Invitation invalide ou expirée.');
    }
    return invitation;
  }

  private mintToken(): { raw: string; tokenHash: string; expiresAt: Date } {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const hours = this.config.get<number>('tokens.invitationExpiresInHours') as number;
    const expiresAt = new Date(Date.now() + hours * 3_600_000);
    return { raw, tokenHash, expiresAt };
  }

  private async sendInvitationEmail(invitation: InvitationWithRelations, rawToken: string): Promise<void> {
    const frontendUrl = this.config.get<string>('frontendUrl');
    const hours = this.config.get<number>('tokens.invitationExpiresInHours');
    const link = `${frontendUrl}/invitation?token=${rawToken}`;
    // Un échec d'envoi ne doit pas faire échouer l'invitation elle-même : l'admin peut "Renvoyer"
    // depuis l'UI si l'e-mail n'est pas arrivé — l'invitation créée reste la trace de l'action.
    await this.emailService.send({
      to: invitation.email,
      subject: `Invitation à rejoindre ${invitation.company.name} sur LogiCore ERP`,
      text:
        `Vous avez été invité(e) à rejoindre ${invitation.company.name} sur LogiCore ERP en tant que ${invitation.role.name}.\n\n` +
        `Pour créer votre compte, cliquez sur ce lien (valable ${hours} heures) :\n${link}\n\n` +
        `Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
    });
  }
}

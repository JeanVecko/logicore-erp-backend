import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { AuthResponseDto, LoginChallengeDto } from './dto/auth-response.dto';

const userWithRoleInclude = Prisma.validator<Prisma.UserInclude>()({
  role: { include: { permissions: { include: { permission: true } } } },
  company: true,
});
type UserWithRole = Prisma.UserGetPayload<{ include: typeof userWithRoleInclude }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /** Inscription self-service : crée l'entreprise (tenant) + son premier utilisateur Admin. */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }

    const adminRole = await this.prisma.role.findUnique({ where: { code: ROLE_CODES.ADMIN } });
    if (!adminRole) {
      throw new BadRequestException("Le rôle Admin n'est pas initialisé — exécutez le seed de la base de données.");
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName, accountType: dto.accountType ?? 'LOGISTICS', logoUrl: dto.logoUrl },
      });
      return tx.user.create({
        data: {
          companyId: company.id,
          roleId: adminRole.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
        include: userWithRoleInclude,
      });
    });

    const verificationToken = await this.tokens.createEmailVerificationToken(user.id);
    await this.sendWelcomeEmail(user.email, dto.companyName, verificationToken);

    return this.buildAuthResponse(user);
  }

  /** E-mail de bienvenue avec lien d'activation — un échec d'envoi ne doit pas faire échouer
   * l'inscription (le compte est déjà créé et utilisable ; l'utilisateur peut aussi redemander
   * ce lien via resendVerificationEmail()). */
  private async sendWelcomeEmail(email: string, companyName: string, verificationToken: string): Promise<void> {
    const activationUrl = `${this.config.get<string>('frontendUrl')}/verify-email?token=${verificationToken}`;
    await this.emailService.send({
      to: email,
      subject: `Félicitations pour votre inscription sur SNADARPE ERP !`,
      text:
        `Félicitations, votre compte administrateur pour "${companyName}" a été créé avec succès sur SNADARPE ERP !\n\n` +
        `Veuillez cliquer sur le lien ci-dessous pour activer votre compte :\n${activationUrl}\n\n` +
        `Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.`,
    });
  }

  /** Étape 1/2 : vérifie e-mail + mot de passe, puis envoie un code de connexion à 6 chiffres par
   * e-mail (aucun jeton émis ici) — voir verifyLoginCode() pour l'étape 2.
   * Tant qu'aucun SMTP réel n'est configuré (voir EmailModule), ce code ne serait reçu par
   * personne : on saute alors directement à la session, comme avant l'introduction du 2e facteur.
   * Repasse automatiquement en mode "code par e-mail" dès que SMTP_HOST est renseigné. */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto | LoginChallengeDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: userWithRoleInclude });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const emailConfigured = Boolean(this.config.get<string>('email.brevoApiKey') || this.config.get<string>('email.smtpHost'));
    if (!emailConfigured) {
      await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return this.buildAuthResponse(user, userAgent, ipAddress);
    }

    await this.sendLoginCode(user.id, user.email);
    return {
      requiresVerification: true,
      email: user.email,
      message: 'Un code de connexion a été envoyé par e-mail.',
    };
  }

  /** Étape 2/2 : consomme le code reçu par e-mail et émet la session (access+refresh token). */
  async verifyLoginCode(email: string, code: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: userWithRoleInclude });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Code de connexion invalide ou expiré');
    }

    await this.tokens.consumeLoginVerificationCode(user.id, code);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.buildAuthResponse(user, userAgent, ipAddress);
  }

  /** Renvoie un nouveau code de connexion — réponse générique (ne confirme pas si le compte existe). */
  async resendLoginCode(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      await this.sendLoginCode(user.id, user.email);
    }
    return { message: 'Si ce compte existe, un nouveau code a été envoyé par e-mail.' };
  }

  private async sendLoginCode(userId: string, email: string): Promise<void> {
    const code = await this.tokens.createLoginVerificationCode(userId);
    const minutes = this.config.get<number>('tokens.loginCodeExpiresInMinutes');
    // Un échec d'envoi ne doit pas bloquer silencieusement l'utilisateur : le code reste valide
    // et consultable dans les logs serveur en environnement sans SMTP réel (provider simulé).
    await this.emailService.send({
      to: email,
      subject: 'Votre code de connexion — SNADARPE ERP',
      text:
        `Votre code de connexion est : ${code}\n\n` +
        `Ce code est valable ${minutes} minutes.\n\n` +
        `Si vous n'êtes pas à l'origine de cette tentative de connexion, ignorez cet e-mail.`,
    });
  }

  async refresh(rawRefreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const record = await this.tokens.verifyRefreshToken(rawRefreshToken);
    await this.tokens.revokeRefreshTokenRaw(rawRefreshToken); // rotation : un refresh token = usage unique
    return this.buildAuthResponse(record.user, userAgent, ipAddress);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshTokenRaw(rawRefreshToken);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Réponse identique que le compte existe ou non : on ne divulgue pas les e-mails enregistrés.
    if (user) {
      await this.tokens.createPasswordResetToken(user.id); // TODO(email): envoyer le lien
    }
    return { message: 'Si ce compte existe, un e-mail de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const record = await this.tokens.consumePasswordResetToken(token);
    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await this.tokens.revokeAllUserRefreshTokens(record.userId);
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllUserRefreshTokens(userId);
    return { message: 'Mot de passe modifié avec succès.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.tokens.consumeEmailVerificationToken(token);
    await this.prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } });
    return { message: 'E-mail vérifié avec succès.' };
  }

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    await this.tokens.createEmailVerificationToken(userId); // TODO(email): envoyer le lien
    return { message: 'E-mail de vérification renvoyé.' };
  }

  /** Émet une session (access+refresh token) pour un utilisateur déjà créé — utilisé après
   * l'acceptation d'une invitation, pour connecter directement la personne comme le fait register(). */
  async issueSessionForUser(userId: string, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userWithRoleInclude });
    return this.buildAuthResponse(user, userAgent, ipAddress);
  }

  // ── Helpers privés ────────────────────────────────────────────────────
  private hashPassword(password: string): Promise<string> {
    const saltRounds = this.config.get<number>('security.bcryptSaltRounds') as number;
    return bcrypt.hash(password, saltRounds);
  }

  private toJwtPayload(user: UserWithRole): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      roleCode: user.role.code,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }

  private async buildAuthResponse(user: UserWithRole, userAgent?: string, ipAddress?: string): Promise<AuthResponseDto> {
    const payload = this.toJwtPayload(user);
    const accessToken = this.tokens.generateAccessToken(payload);
    const refreshToken = await this.tokens.generateRefreshToken(user.id, userAgent, ipAddress);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        roleCode: user.role.code,
        roleName: user.role.name,
        isEmailVerified: user.isEmailVerified,
        accountType: user.company.accountType,
      },
    };
  }
}

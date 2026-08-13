import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { generateToken, generateNumericCode, hashToken } from '../common/utils/token.util';

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Access token (JWT signé, court terme) ──────────────────────────────
  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
  }

  // ── Refresh token (opaque, stocké haché en base, rotatif) ──────────────
  async generateRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const raw = generateToken(48);
    const tokenHash = hashToken(raw);
    const expiresAt = this.addDuration(new Date(), this.config.get<string>('jwt.refreshExpiresIn') as string);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, userAgent, ipAddress, expiresAt },
    });
    return raw;
  }

  async verifyRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } }, company: true } } },
    });

    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
    return record;
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
  }

  async revokeRefreshTokenRaw(rawToken: string): Promise<void> {
    await this.revokeRefreshToken(hashToken(rawToken));
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  }

  // ── Reset mot de passe ──────────────────────────────────────────────────
  async createPasswordResetToken(userId: string): Promise<string> {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const minutes = this.config.get<number>('tokens.passwordResetExpiresInMinutes') as number;
    const expiresAt = new Date(Date.now() + minutes * 60_000);

    await this.prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    return raw;
  }

  async consumePasswordResetToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Lien de réinitialisation invalide ou expiré');
    }
    await this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } });
    return record;
  }

  // ── Vérification e-mail ─────────────────────────────────────────────────
  async createEmailVerificationToken(userId: string): Promise<string> {
    const raw = generateToken(32);
    const tokenHash = hashToken(raw);
    const hours = this.config.get<number>('tokens.emailVerificationExpiresInHours') as number;
    const expiresAt = new Date(Date.now() + hours * 3_600_000);

    await this.prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } });
    return raw;
  }

  async consumeEmailVerificationToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Lien de vérification invalide ou expiré');
    }
    await this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } });
    return record;
  }

  // ── Code de connexion (2e facteur envoyé par e-mail) ────────────────────
  async createLoginVerificationCode(userId: string): Promise<string> {
    const raw = generateNumericCode(6);
    const codeHash = hashToken(raw);
    const minutes = this.config.get<number>('tokens.loginCodeExpiresInMinutes') as number;
    const expiresAt = new Date(Date.now() + minutes * 60_000);

    // Un code précédent non utilisé ne doit plus être valide une fois qu'un nouveau est demandé
    // (renvoi, ou nouvelle tentative de connexion) — évite d'avoir plusieurs codes valides à la fois.
    await this.prisma.loginVerificationCode.updateMany({ where: { userId, used: false }, data: { used: true } });
    await this.prisma.loginVerificationCode.create({ data: { userId, codeHash, expiresAt } });
    return raw;
  }

  async consumeLoginVerificationCode(userId: string, rawCode: string) {
    const codeHash = hashToken(rawCode);
    const record = await this.prisma.loginVerificationCode.findFirst({
      where: { userId, codeHash, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Code de connexion invalide ou expiré');
    }
    await this.prisma.loginVerificationCode.update({ where: { id: record.id }, data: { used: true } });
    return record;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  /** Additionne une durée type "15m" / "7d" / "1h" à une date. */
  private addDuration(base: Date, duration: string): Date {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return new Date(base.getTime() + 7 * 24 * 3_600_000); // fallback 7j

    const value = parseInt(match[1], 10);
    const unitMs: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(base.getTime() + value * unitMs[match[2]]);
  }
}

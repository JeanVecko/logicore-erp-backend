export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  database: { url: string };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  security: {
    bcryptSaltRounds: number;
    corsOrigin: string[];
    throttleTtl: number;
    throttleLimit: number;
  };
  tokens: {
    passwordResetExpiresInMinutes: number;
    emailVerificationExpiresInHours: number;
    invitationExpiresInHours: number;
  };
  frontendUrl: string;
  seed: {
    companyName: string;
    superAdminEmail: string;
    superAdminPassword: string;
  };
  ai: {
    anthropicApiKey?: string;
    model: string;
  };
  email: {
    smtpHost?: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPass?: string;
    fromAddress: string;
    fromName: string;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    corsOrigin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    throttleTtl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  tokens: {
    passwordResetExpiresInMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ?? '30', 10),
    emailVerificationExpiresInHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_IN_HOURS ?? '24', 10),
    invitationExpiresInHours: parseInt(process.env.INVITATION_EXPIRES_IN_HOURS ?? '72', 10),
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  seed: {
    companyName: process.env.SEED_COMPANY_NAME ?? 'LogiCore SA',
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL as string,
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD as string,
  },
  ai: {
    // Optionnelle : tant qu'elle n'est pas renseignée, AiService répond avec des réponses
    // simulées (mais construites à partir des vraies données de stock de l'entreprise).
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  },
  email: {
    // Optionnel : tant que smtpHost n'est pas renseigné, EmailModule utilise un provider simulé
    // (loggue l'e-mail au lieu de l'envoyer) — même philosophie que le bloc `ai` ci-dessus.
    smtpHost: process.env.SMTP_HOST || undefined,
    smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || undefined,
    smtpPass: process.env.SMTP_PASS || undefined,
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'no-reply@logicore.local',
    fromName: process.env.EMAIL_FROM_NAME ?? 'LogiCore ERP',
  },
});

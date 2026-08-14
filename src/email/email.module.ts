import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EMAIL_PROVIDER } from './email.interface';
import { BrevoEmailProvider } from './providers/brevo-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { SimulatedEmailProvider } from './providers/simulated-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    BrevoEmailProvider,
    SmtpEmailProvider,
    SimulatedEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService, BrevoEmailProvider, SmtpEmailProvider, SimulatedEmailProvider],
      useFactory: (
        config: ConfigService,
        brevo: BrevoEmailProvider,
        smtp: SmtpEmailProvider,
        simulated: SimulatedEmailProvider,
      ) => {
        if (config.get<string>('email.brevoApiKey')) return brevo;
        if (config.get<string>('email.smtpHost')) return smtp;
        return simulated;
      },
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}

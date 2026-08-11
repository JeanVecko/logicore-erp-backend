import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EMAIL_PROVIDER } from './email.interface';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { SimulatedEmailProvider } from './providers/simulated-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    SmtpEmailProvider,
    SimulatedEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [ConfigService, SmtpEmailProvider, SimulatedEmailProvider],
      useFactory: (config: ConfigService, smtp: SmtpEmailProvider, simulated: SimulatedEmailProvider) =>
        config.get<string>('email.smtpHost') ? smtp : simulated,
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}

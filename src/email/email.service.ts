import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER, EmailProvider, SendEmailInput, SendEmailResult } from './email.interface';

/**
 * Point d'entrée unique pour envoyer un e-mail depuis n'importe quel module métier. Ne dépend
 * que de l'interface EmailProvider — changer de fournisseur d'e-mail (SMTP, SendGrid, SES...)
 * se fait entièrement dans email.module.ts, sans toucher aux modules qui appellent EmailService.
 */
@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  send(input: SendEmailInput): Promise<SendEmailResult> {
    return this.provider.send(input);
  }
}

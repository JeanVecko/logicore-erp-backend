import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.interface';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Envoie par l'API HTTP de Brevo plutôt que par SMTP — nécessaire en hébergement cloud (Render...)
 * où le trafic SMTP sortant est généralement bloqué par défaut, contrairement au trafic HTTPS.
 */
@Injectable()
export class BrevoEmailProvider implements EmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('email.brevoApiKey') as string;
    this.fromAddress = this.config.get<string>('email.fromAddress') as string;
    this.fromName = this.config.get<string>('email.fromName') as string;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const res = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.fromName, email: this.fromAddress },
          to: [{ email: input.to }],
          subject: input.subject,
          textContent: input.text,
          htmlContent: input.html,
          attachment: input.attachments?.map((a) => ({
            name: a.filename,
            content: a.content.toString('base64'),
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Brevo ${res.status} : ${body}`);
      }
      return { success: true };
    } catch (error) {
      this.logger.error(`Échec d'envoi Brevo vers ${input.to} : ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }
}

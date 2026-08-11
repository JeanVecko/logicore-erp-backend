import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.interface';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.smtpHost'),
      port: this.config.get<number>('email.smtpPort'),
      secure: this.config.get<boolean>('email.smtpSecure'),
      auth: this.config.get<string>('email.smtpUser')
        ? { user: this.config.get<string>('email.smtpUser'), pass: this.config.get<string>('email.smtpPass') }
        : undefined,
    });
    this.fromAddress = this.config.get<string>('email.fromAddress') as string;
    this.fromName = this.config.get<string>('email.fromName') as string;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Échec d'envoi SMTP vers ${input.to} : ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }
}

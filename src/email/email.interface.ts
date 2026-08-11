export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

/** Token d'injection du provider — c'est cette interface, pas nodemailer, que les modules métier consomment. */
export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

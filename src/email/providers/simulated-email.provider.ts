import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.interface';

/**
 * Utilisé tant qu'aucun SMTP n'est configuré (email.smtpHost absent) — même philosophie que
 * AiService qui simule des réponses tant qu'ANTHROPIC_API_KEY n'est pas renseignée. Permet de
 * tester tout le workflow d'envoi de bout en bout sans identifiants réels : l'e-mail n'est
 * jamais réellement envoyé, juste consigné dans les logs serveur.
 */
@Injectable()
export class SimulatedEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SimulatedEmailProvider.name);

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.warn(
      `[SIMULÉ — aucun SMTP configuré] E-mail à ${input.to} · Objet : "${input.subject}" · ` +
        `Pièce(s) jointe(s) : ${input.attachments?.map((a) => a.filename).join(', ') || 'aucune'}`,
    );
    // Le corps est aussi loggué (uniquement en mode simulé) : c'est le seul moyen de retrouver un
    // lien à usage unique (invitation, réinitialisation...) dans cet environnement sans SMTP réel.
    if (input.text) this.logger.debug(`[SIMULÉ] Corps du message :\n${input.text}`);
    return { success: true };
  }
}

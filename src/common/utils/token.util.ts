import { randomBytes, createHash } from 'crypto';

/** Jeton opaque à usage unique (reset mot de passe, vérification e-mail, invitation...). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Seul ce hash est stocké en base — le jeton brut n'existe qu'une fois, dans le lien envoyé. */
export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

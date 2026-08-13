import { randomBytes, createHash } from 'crypto';

/** Jeton opaque à usage unique (reset mot de passe, vérification e-mail, invitation...). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Seul ce hash est stocké en base — le jeton brut n'existe qu'une fois, dans le lien envoyé. */
export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Code numérique (ex: connexion par e-mail) — tiré via randomBytes, pas Math.random(). */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const value = randomBytes(4).readUInt32BE(0) % max;
  return value.toString().padStart(digits, '0');
}

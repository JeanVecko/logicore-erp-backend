/**
 * Codes de rôle système. Stables — utilisés par le seed, les guards et les décorateurs @Roles().
 * Le libellé affiché (français) vit en base (Role.name), pas ici.
 */
export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DIRECTEUR_GENERAL: 'DIRECTEUR_GENERAL',
  RESPONSABLE_LOGISTIQUE: 'RESPONSABLE_LOGISTIQUE',
  STOREKEEPER: 'STOREKEEPER',
  ACHETEUR: 'ACHETEUR',
  COMPTABLE: 'COMPTABLE',
  AUDITEUR: 'AUDITEUR',
  CHEF_DEPARTEMENT: 'CHEF_DEPARTEMENT',
  UTILISATEUR: 'UTILISATEUR',
  COMMERCIAL: 'COMMERCIAL',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const DEFAULT_ROLES: Array<{ code: RoleCode; name: string; description: string; isSystem: boolean }> = [
  { code: ROLE_CODES.SUPER_ADMIN, name: 'Super Admin', description: 'Accès total, tous les tenants', isSystem: true },
  { code: ROLE_CODES.ADMIN, name: 'Admin', description: "Administration de l'entreprise", isSystem: true },
  { code: ROLE_CODES.DIRECTEUR_GENERAL, name: 'Directeur Général', description: 'Vision globale, validations stratégiques', isSystem: true },
  { code: ROLE_CODES.RESPONSABLE_LOGISTIQUE, name: 'Responsable Logistique', description: 'Pilotage des opérations logistiques', isSystem: true },
  { code: ROLE_CODES.STOREKEEPER, name: 'Storekeeper', description: 'Gestion physique du stock en dépôt', isSystem: true },
  { code: ROLE_CODES.ACHETEUR, name: 'Acheteur', description: 'Achats et fournisseurs', isSystem: true },
  { code: ROLE_CODES.COMPTABLE, name: 'Comptable', description: 'Suivi financier et comptable', isSystem: true },
  { code: ROLE_CODES.AUDITEUR, name: 'Auditeur', description: 'Lecture seule, contrôle et conformité', isSystem: true },
  { code: ROLE_CODES.CHEF_DEPARTEMENT, name: 'Chef de Département', description: "Responsable d'un département", isSystem: true },
  { code: ROLE_CODES.UTILISATEUR, name: 'Utilisateur', description: 'Accès standard restreint', isSystem: true },
  { code: ROLE_CODES.COMMERCIAL, name: 'Chargé de Vente', description: 'Ventes, devis et suivi client', isSystem: true },
];

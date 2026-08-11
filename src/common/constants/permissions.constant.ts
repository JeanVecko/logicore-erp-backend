import { ROLE_CODES, RoleCode } from './roles.constant';

export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Un module par domaine métier de l'arborescence src/. */
export const PERMISSION_MODULES = [
  'users',
  'roles',
  'permissions',
  'companies',
  'warehouses',
  'products',
  'categories',
  'suppliers',
  'customers',
  'inventory',
  'stock-movements',
  'transfers',
  'purchases',
  'purchase-orders',
  'purchase-requisitions',
  'sales',
  'quotes',
  'delivery-notes',
  'invoices',
  'payments',
  'requests',
  'assets',
  'fleet',
  'maintenance',
  'reports',
  'dashboard',
  'notifications',
  'audit',
  'ai',
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export function permissionCode(module: PermissionModule, action: PermissionAction): string {
  return `${module}:${action}`;
}

export const DEFAULT_PERMISSIONS = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_ACTIONS.map((action) => ({
    code: permissionCode(module, action),
    module,
    action,
    description: `Permission "${action}" sur le module "${module}"`,
  })),
);

const forModules = (modules: PermissionModule[], actions: PermissionAction[] = ['create', 'read', 'update']) =>
  modules.flatMap((m) => actions.map((a) => permissionCode(m, a)));

const readOnlyAll = () => PERMISSION_MODULES.map((m) => permissionCode(m, 'read'));

/** Accès de base commun à tous les rôles authentifiés : voir le tableau de bord, ses notifications,
 * et utiliser l'assistant IA (aide générique, pas d'accès élargi aux données au-delà de ce que
 * l'utilisateur voit déjà sur le tableau de bord). */
const BASELINE = [...forModules(['dashboard', 'notifications'], ['read', 'update']), ...forModules(['ai'], ['read', 'create'])];

/** '*' = toutes les permissions (résolu dans le seed). */
export const ROLE_PERMISSION_MATRIX: Record<RoleCode, string[] | '*'> = {
  [ROLE_CODES.SUPER_ADMIN]: '*',
  [ROLE_CODES.ADMIN]: '*',
  [ROLE_CODES.DIRECTEUR_GENERAL]: [...readOnlyAll(), ...forModules(['reports', 'dashboard'], [...PERMISSION_ACTIONS])],
  [ROLE_CODES.RESPONSABLE_LOGISTIQUE]: [
    ...BASELINE,
    ...forModules([
      'inventory',
      'stock-movements',
      'transfers',
      'warehouses',
      'products',
      'categories',
      'purchases',
      'purchase-orders',
      'purchase-requisitions',
      'suppliers',
      'requests',
      'dashboard',
      'reports',
      'sales',
      'customers',
      'quotes',
      'delivery-notes',
    ]),
  ],
  [ROLE_CODES.STOREKEEPER]: [
    ...BASELINE,
    ...forModules(['inventory', 'stock-movements', 'transfers', 'products']),
    ...forModules(['purchase-orders'], ['create', 'read']),
  ],
  [ROLE_CODES.ACHETEUR]: [...BASELINE, ...forModules(['purchases', 'purchase-orders', 'purchase-requisitions', 'suppliers', 'products'])],
  [ROLE_CODES.COMPTABLE]: [
    ...BASELINE,
    ...forModules(['purchases', 'sales', 'reports', 'suppliers', 'customers', 'quotes', 'delivery-notes'], ['read']),
    ...forModules(['invoices', 'payments'], ['create', 'read', 'update']),
  ],
  [ROLE_CODES.AUDITEUR]: readOnlyAll(),
  [ROLE_CODES.CHEF_DEPARTEMENT]: [...BASELINE, ...forModules(['requests', 'reports', 'dashboard', 'users'])],
  [ROLE_CODES.UTILISATEUR]: [...BASELINE, ...forModules(['requests', 'dashboard'], ['read', 'create'])],
  [ROLE_CODES.COMMERCIAL]: [
    ...BASELINE,
    ...forModules(['sales', 'customers', 'quotes', 'delivery-notes']),
    ...forModules(['products', 'inventory'], ['read']),
  ],
};

/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_PERMISSIONS } from '../../src/common/constants/permissions.constant';
import { DEFAULT_ROLES, ROLE_CODES } from '../../src/common/constants/roles.constant';
import { ROLE_PERMISSION_MATRIX } from '../../src/common/constants/permissions.constant';

const prisma = new PrismaClient();

const DEFAULT_CURRENCIES = [
  { code: 'FC', name: 'Franc CFA (BEAC)', symbol: 'FC', exchangeRateToBase: 1, isBase: true },
  { code: 'USD', name: 'Dollar américain', symbol: '$', exchangeRateToBase: 0.0016, isBase: false },
  { code: 'EUR', name: 'Euro', symbol: '€', exchangeRateToBase: 0.0015, isBase: false },
];

async function seedCurrencies() {
  for (const currency of DEFAULT_CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }
  console.log(`✅ ${DEFAULT_CURRENCIES.length} devises seedées`);
}

async function seedPermissions() {
  for (const permission of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { module: permission.module, action: permission.action, description: permission.description },
      create: permission,
    });
  }
  console.log(`✅ ${DEFAULT_PERMISSIONS.length} permissions seedées`);
}

async function seedRolesAndPermissions() {
  const allPermissions = await prisma.permission.findMany();
  const permissionIdByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  for (const role of DEFAULT_ROLES) {
    const created = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, isSystem: role.isSystem },
      create: role,
    });

    const matrixEntry = ROLE_PERMISSION_MATRIX[role.code];
    const codes = matrixEntry === '*' ? allPermissions.map((p) => p.code) : matrixEntry;

    // Repart de zéro pour ce rôle afin que le seed soit idempotent même si la matrice change.
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    const uniqueIds = new Set(codes.map((code) => permissionIdByCode.get(code)).filter((id): id is string => Boolean(id)));
    const permissionIds = Array.from(uniqueIds);

    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: created.id, permissionId })),
      });
    }
  }
  console.log(`✅ ${DEFAULT_ROLES.length} rôles seedés avec leurs permissions`);
}

async function seedDefaultCompanyAndSuperAdmin(): Promise<string> {
  const companyName = process.env.SEED_COMPANY_NAME ?? 'LogiCore SA';
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@logicore.local';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';

  let company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName, baseCurrency: 'FC', timezone: 'Africa/Douala' },
    });
    console.log(`✅ Entreprise par défaut créée : ${company.name}`);
  } else {
    console.log(`ℹ️  Entreprise par défaut déjà existante : ${company.name}`);
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: ROLE_CODES.SUPER_ADMIN } });

  const existingUser = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (existingUser) {
    console.log(`ℹ️  Super Admin déjà existant : ${superAdminEmail}`);
    return company.id;
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);
  const superAdmin = await prisma.user.create({
    data: {
      companyId: company.id,
      roleId: superAdminRole.id,
      email: superAdminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Super Admin créé : ${superAdmin.email}`);
  console.log(`   Mot de passe initial : ${superAdminPassword} (à changer immédiatement en production)`);
  return company.id;
}

// Identifiants du catalogue/entrepôt de démonstration posés par une ancienne version de ce seed —
// supprimés ici pour laisser l'entreprise vide, prête à recevoir de vrais articles. Sans effet une
// fois ce nettoyage passé une première fois (plus rien à trouver), donc sûr de laisser en place.
const DEMO_CATEGORY_CODES = ['MAT', 'ELE', 'PLO', 'PEI', 'QUI'];
const DEMO_PRODUCT_SKUS = ['CIM-0042', 'FER-0117', 'PEI-0089', 'TUB-0203', 'CAB-0056', 'VIS-0312', 'DIS-0071', 'ROB-0144'];
const DEMO_WAREHOUSE_CODE = 'DEP-CTR';

async function cleanupDemoCatalog(companyId: string) {
  const demoProducts = await prisma.product.findMany({ where: { companyId, sku: { in: DEMO_PRODUCT_SKUS } } });
  const productIds = demoProducts.map((p) => p.id);

  if (productIds.length > 0) {
    await prisma.stockMovement.deleteMany({ where: { companyId, productId: { in: productIds } } });
    await prisma.inventory.deleteMany({ where: { companyId, productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    console.log(`🧹 ${productIds.length} article(s) de démonstration supprimé(s)`);
  }

  const demoCategories = await prisma.category.findMany({ where: { companyId, code: { in: DEMO_CATEGORY_CODES } } });
  let removedCategories = 0;
  for (const category of demoCategories) {
    const remaining = await prisma.product.count({ where: { categoryId: category.id } });
    if (remaining === 0) {
      await prisma.category.delete({ where: { id: category.id } });
      removedCategories += 1;
    }
  }
  if (removedCategories > 0) console.log(`🧹 ${removedCategories} catégorie(s) de démonstration supprimée(s)`);

  const warehouse = await prisma.warehouse.findUnique({ where: { companyId_code: { companyId, code: DEMO_WAREHOUSE_CODE } } });
  if (warehouse) {
    const [movements, inventory] = await Promise.all([
      prisma.stockMovement.count({ where: { OR: [{ warehouseId: warehouse.id }, { targetWarehouseId: warehouse.id }] } }),
      prisma.inventory.count({ where: { warehouseId: warehouse.id } }),
    ]);
    if (movements === 0 && inventory === 0) {
      // Détache les utilisateurs éventuellement rattachés à ce dépôt avant de le supprimer
      // (champ optionnel — on les laisse simplement sans dépôt par défaut).
      await prisma.user.updateMany({ where: { warehouseId: warehouse.id }, data: { warehouseId: null } });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
      console.log(`🧹 Entrepôt de démonstration "${warehouse.name}" supprimé`);
    } else {
      console.log(`ℹ️  Entrepôt "${warehouse.name}" conservé (encore référencé par de vraies données)`);
    }
  }
}

async function main() {
  console.log('🌱 Démarrage du seed SNADARPE ERP...\n');
  await seedCurrencies();
  await seedPermissions();
  await seedRolesAndPermissions();
  const companyId = await seedDefaultCompanyAndSuperAdmin();
  await cleanupDemoCatalog(companyId);
  console.log('\n🌱 Seed terminé avec succès.');
}

main()
  .catch((error) => {
    console.error('❌ Le seed a échoué :', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

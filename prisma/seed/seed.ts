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

const DEFAULT_CATEGORIES = [
  { name: 'Matériaux', code: 'MAT' },
  { name: 'Électricité', code: 'ELE' },
  { name: 'Plomberie', code: 'PLO' },
  { name: 'Peinture', code: 'PEI' },
  { name: 'Quincaillerie', code: 'QUI' },
];

async function seedDefaultCategories(companyId: string) {
  for (const { name, code } of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { companyId_name: { companyId, name } },
      update: {},
      create: { companyId, name, code },
    });
  }
  console.log(`✅ ${DEFAULT_CATEGORIES.length} catégories par défaut prêtes`);
}

const DEFAULT_PRODUCTS = [
  { sku: 'CIM-0042', name: 'Ciment CPJ 45 — sac 50kg', category: 'Matériaux', unit: 'sac', purchasePrice: 8500, sellingPrice: 9500, reorderPoint: 50, initialStock: 8 },
  { sku: 'FER-0117', name: 'Fer à béton Ø12mm — barre 12m', category: 'Matériaux', unit: 'barre', purchasePrice: 125000, sellingPrice: 138000, reorderPoint: 40, initialStock: 34 },
  { sku: 'PEI-0089', name: 'Peinture acrylique blanche 20L', category: 'Peinture', unit: 'bidon', purchasePrice: 65000, sellingPrice: 72000, reorderPoint: 20, initialStock: 3 },
  { sku: 'TUB-0203', name: 'Tube PVC Ø100 — longueur 3m', category: 'Plomberie', unit: 'tube', purchasePrice: 20000, sellingPrice: 23000, reorderPoint: 70, initialStock: 61 },
  { sku: 'CAB-0056', name: 'Câble électrique souple 2.5mm²', category: 'Électricité', unit: 'rouleau', purchasePrice: 75000, sellingPrice: 84000, reorderPoint: 30, initialStock: 5 },
  { sku: 'VIS-0312', name: 'Vis à bois inox 4x40mm — boîte 200', category: 'Quincaillerie', unit: 'boîte', purchasePrice: 5000, sellingPrice: 5800, reorderPoint: 60, initialStock: 142 },
  { sku: 'DIS-0071', name: 'Disjoncteur différentiel 30mA', category: 'Électricité', unit: 'pièce', purchasePrice: 35000, sellingPrice: 39500, reorderPoint: 15, initialStock: 27 },
  { sku: 'ROB-0144', name: 'Robinet mitigeur cuisine chromé', category: 'Plomberie', unit: 'pièce', purchasePrice: 30000, sellingPrice: 34000, reorderPoint: 12, initialStock: 19 },
];

async function seedDefaultProducts(companyId: string) {
  const categories = await prisma.category.findMany({ where: { companyId } });
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

  for (const product of DEFAULT_PRODUCTS) {
    const categoryId = categoryIdByName.get(product.category);
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: product.sku } },
      update: {},
      create: {
        companyId,
        categoryId,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        reorderPoint: product.reorderPoint,
      },
    });
  }
  console.log(`✅ ${DEFAULT_PRODUCTS.length} articles de démonstration prêts`);
}

async function seedInitialInventory(companyId: string) {
  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { companyId_code: { companyId, code: 'DEP-CTR' } },
  });
  const products = await prisma.product.findMany({ where: { companyId } });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  let created = 0;
  for (const item of DEFAULT_PRODUCTS) {
    const product = productBySku.get(item.sku);
    if (!product) continue;

    const existingInventory = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
    });
    if (existingInventory) continue; // déjà initialisé, on ne rejoue pas le mouvement

    await prisma.$transaction([
      prisma.inventory.create({
        data: { companyId, productId: product.id, warehouseId: warehouse.id, quantity: item.initialStock },
      }),
      prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          warehouseId: warehouse.id,
          type: 'ENTRY',
          quantity: item.initialStock,
          reference: 'STOCK-INITIAL',
          notes: 'Stock initial saisi lors de la mise en place',
        },
      }),
    ]);
    created += 1;
  }
  console.log(`✅ Stock initial posé pour ${created} article(s) (via mouvements ENTRY réels)`);
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

  const warehouseCode = 'DEP-CTR';
  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: warehouseCode } },
    update: {},
    create: { companyId: company.id, name: 'Dépôt Central', code: warehouseCode },
  });
  console.log(`✅ Entrepôt par défaut prêt : ${warehouse.name}`);

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
      warehouseId: warehouse.id,
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

async function main() {
  console.log('🌱 Démarrage du seed LogiCore ERP...\n');
  await seedCurrencies();
  await seedPermissions();
  await seedRolesAndPermissions();
  const companyId = await seedDefaultCompanyAndSuperAdmin();
  await seedDefaultCategories(companyId);
  await seedDefaultProducts(companyId);
  await seedInitialInventory(companyId);
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

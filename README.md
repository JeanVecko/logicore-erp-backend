# LogiCore ERP — Backend

API REST NestJS pour LogiCore ERP : multi-tenant (entreprises), multi-entrepôts, multi-devises,
authentification JWT et RBAC complet.

## Stack

NestJS · TypeScript · Prisma ORM · SQLite (dev) / PostgreSQL (prod) · JWT · RBAC · Swagger · Docker ·
class-validator · Winston (nest-winston) · Helmet · CORS · Rate limiting (`@nestjs/throttler`).

## Démarrage (développement, SQLite)

```bash
npm install
cp .env.example .env          # déjà fait dans ce dépôt, adapter si besoin
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

- API : http://localhost:3000/api/v1
- Swagger : http://localhost:3000/docs

Identifiants Super Admin créés par le seed (voir `.env` → `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`).

## Migration vers PostgreSQL (production)

1. Dans `prisma/schema.prisma`, changer `provider = "sqlite"` en `provider = "postgresql"`.
2. Adapter `DATABASE_URL` (ex: `postgresql://user:password@host:5432/logicore_erp?schema=public`).
3. `npx prisma migrate deploy`
4. `npm run prisma:seed`

`docker-compose.yml` fournit une pile PostgreSQL + API prête pour ce chemin.

## Architecture

- **Clean Architecture par module** : `controller` (HTTP) → `service` (logique métier) → `repository`
  (accès Prisma). Les services ne dépendent jamais de Prisma directement.
- **Multi-tenant** : `Company` est la racine tenant ; `User` et `Warehouse` y sont rattachés. Toutes
  les requêtes des modules métier sont scopées par `companyId` (issu du JWT).
- **RBAC** : catalogue de `Role` (10 rôles système) et `Permission` (`module:action`) globaux, liés par
  `RolePermission`. Les rôles/permissions du JWT sont vérifiés par `RolesGuard` / `PermissionsGuard` via
  les décorateurs `@Roles()` / `@Permissions()`.
- **Auth** : login, logout, refresh token (rotatif, haché en base), forgot/reset password, change
  password, vérification e-mail — voir `src/auth`.
- **Modules métier scaffoldés** (`products`, `purchases`, `sales`, `fleet`, `maintenance`, ...) :
  enregistrés et protégés par JWT/RBAC, prêts à être développés module par module.

## Scripts utiles

| Commande | Effet |
|---|---|
| `npm run start:dev` | Démarre l'API en mode watch |
| `npm run prisma:studio` | Explorateur de données Prisma |
| `npm run prisma:migrate:dev` | Nouvelle migration en dev |
| `npm run prisma:seed` | Rejoue le seed (idempotent) |
| `npm run db:reset` | Réinitialise la base (dev uniquement) |
| `npm run lint` / `npm run test` | Qualité de code / tests |

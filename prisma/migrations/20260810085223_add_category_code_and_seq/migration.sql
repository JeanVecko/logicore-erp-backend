/*
  Warnings:

  - Made the column `code` on table `categories` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nextProductSeq" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("code", "companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt") SELECT "code", "companyId", "createdAt", "description", "id", "isActive", "name", "updatedAt" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_companyId_name_key" ON "categories"("companyId", "name");
CREATE UNIQUE INDEX "categories_companyId_code_key" ON "categories"("companyId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

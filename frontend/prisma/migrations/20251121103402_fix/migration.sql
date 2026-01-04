/*
  Warnings:

  - The values [MANUAL] on the enum `DataImport_sourceKind` will be removed. If these variants are still used in the database, this will fail.
  - The values [MANUAL] on the enum `DataImport_phase` will be removed. If these variants are still used in the database, this will fail.
  - The values [MANUAL] on the enum `DataImport_sourceKind` will be removed. If these variants are still used in the database, this will fail.
  - The values [custom] on the enum `Model_mode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `customfunction` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `datafeed` MODIFY `kind` ENUM('API', 'FILE') NOT NULL;

-- AlterTable
ALTER TABLE `dataimport` MODIFY `phase` ENUM('INITIAL', 'UPDATE') NOT NULL,
    MODIFY `sourceKind` ENUM('API', 'FILE') NOT NULL;

-- AlterTable
ALTER TABLE `model` MODIFY `description` TEXT NULL,
    MODIFY `mode` ENUM('pretrained') NOT NULL DEFAULT 'pretrained';

-- AlterTable
ALTER TABLE `user` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`;

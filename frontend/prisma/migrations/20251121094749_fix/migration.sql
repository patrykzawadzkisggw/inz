/*
  Warnings:

  - You are about to drop the column `rowCount` on the `dataimport` table. All the data in the column will be lost.
  - Made the column `sourceRef` on table `dataimport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `importOptionsJson` on table `dataimport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `processedSchemaJson` on table `dataimport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dataBlob` on table `dataimport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `model` required. This step will fail if there are existing NULL values in that column.
  - Made the column `configJson` on table `model` required. This step will fail if there are existing NULL values in that column.
  - Made the column `frequencyValue` on table `report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `frequencyUnit` on table `report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `messageTemplate` on table `report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `report` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `widget` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `widget` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `model` DROP FOREIGN KEY `Model_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `report` DROP FOREIGN KEY `Report_userId_fkey`;

-- DropForeignKey
ALTER TABLE `widget` DROP FOREIGN KEY `Widget_userId_fkey`;

-- DropIndex
DROP INDEX `Report_userId_fkey` ON `report`;

-- AlterTable
ALTER TABLE `customfunction` MODIFY `body` TEXT NOT NULL,
    MODIFY `body2` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `datafeed` ADD COLUMN `frequencyUnit` ENUM('m', 'h', 'd') NOT NULL DEFAULT 'd',
    ADD COLUMN `frequencyValue` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `dataimport` DROP COLUMN `rowCount`,
    MODIFY `sourceRef` VARCHAR(191) NOT NULL,
    MODIFY `importOptionsJson` JSON NOT NULL,
    MODIFY `processedSchemaJson` JSON NOT NULL,
    MODIFY `dataBlob` LONGBLOB NOT NULL;

-- AlterTable
ALTER TABLE `model` MODIFY `mode` ENUM('pretrained', 'custom') NOT NULL DEFAULT 'pretrained',
    MODIFY `ownerId` VARCHAR(191) NOT NULL,
    MODIFY `configJson` JSON NOT NULL;

-- AlterTable
ALTER TABLE `report` MODIFY `frequencyValue` INTEGER NOT NULL DEFAULT 1,
    MODIFY `frequencyUnit` ENUM('m', 'h', 'd') NOT NULL DEFAULT 'd',
    MODIFY `messageTemplate` TEXT NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `email` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `widget` MODIFY `userId` VARCHAR(191) NOT NULL,
    MODIFY `content` TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE `Model` ADD CONSTRAINT `Model_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Widget` ADD CONSTRAINT `Widget_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

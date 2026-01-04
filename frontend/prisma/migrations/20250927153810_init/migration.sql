/*
  Warnings:

  - You are about to drop the `modeldatarow` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `modeldatarow` DROP FOREIGN KEY `ModelDataRow_importId_fkey`;

-- DropForeignKey
ALTER TABLE `modeldatarow` DROP FOREIGN KEY `ModelDataRow_modelId_fkey`;

-- AlterTable
ALTER TABLE `dataimport` ADD COLUMN `dataBlob` LONGBLOB NULL;

-- DropTable
DROP TABLE `modeldatarow`;

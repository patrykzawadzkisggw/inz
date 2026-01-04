/*
  Warnings:

  - You are about to drop the column `endpointUrl` on the `datafeed` table. All the data in the column will be lost.
  - You are about to drop the column `processingScript` on the `datafeed` table. All the data in the column will be lost.
  - You are about to drop the column `scriptUsed` on the `dataimport` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `dataimport` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `model` table. All the data in the column will be lost.
  - You are about to drop the column `trainingRunId` on the `prediction` table. All the data in the column will be lost.
  - You are about to drop the column `cacheTs` on the `widget` table. All the data in the column will be lost.
  - You are about to drop the column `dataQuery` on the `widget` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `widget` table. All the data in the column will be lost.
  - You are about to drop the `log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trainingrun` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ownerId,name]` on the table `Model` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `log` DROP FOREIGN KEY `Log_functionId_fkey`;

-- DropForeignKey
ALTER TABLE `log` DROP FOREIGN KEY `Log_modelId_fkey`;

-- DropForeignKey
ALTER TABLE `log` DROP FOREIGN KEY `Log_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `log` DROP FOREIGN KEY `Log_trainingRunId_fkey`;

-- DropForeignKey
ALTER TABLE `log` DROP FOREIGN KEY `Log_widgetId_fkey`;

-- DropForeignKey
ALTER TABLE `prediction` DROP FOREIGN KEY `Prediction_trainingRunId_fkey`;

-- DropForeignKey
ALTER TABLE `trainingrun` DROP FOREIGN KEY `TrainingRun_modelId_fkey`;

-- DropIndex
DROP INDEX `Model_status_idx` ON `model`;

-- DropIndex
DROP INDEX `Prediction_trainingRunId_idx` ON `prediction`;

-- AlterTable
ALTER TABLE `datafeed` DROP COLUMN `endpointUrl`,
    DROP COLUMN `processingScript`;

-- AlterTable
ALTER TABLE `dataimport` DROP COLUMN `scriptUsed`,
    DROP COLUMN `status`;

-- AlterTable
ALTER TABLE `model` DROP COLUMN `status`;

-- AlterTable
ALTER TABLE `prediction` DROP COLUMN `trainingRunId`;

-- AlterTable
ALTER TABLE `widget` DROP COLUMN `cacheTs`,
    DROP COLUMN `dataQuery`,
    DROP COLUMN `order`;

-- DropTable
DROP TABLE `log`;

-- DropTable
DROP TABLE `trainingrun`;

-- CreateIndex
CREATE UNIQUE INDEX `Model_ownerId_name_key` ON `Model`(`ownerId`, `name`);

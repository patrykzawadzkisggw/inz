/*
  Warnings:

  - You are about to drop the column `horizon` on the `prediction` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `prediction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `datafeed` ADD COLUMN `lastRunAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `prediction` DROP COLUMN `horizon`,
    DROP COLUMN `target`;

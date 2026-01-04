/*
  Warnings:

  - The values [timegpt] on the enum `Model_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `model` MODIFY `type` ENUM('chronos', 'morai', 'timesfm') NOT NULL;

-- AlterTable
ALTER TABLE `dataimport` ADD COLUMN `importOptionsJson` JSON NULL,
    ADD COLUMN `processedSchemaJson` JSON NULL;

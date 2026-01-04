-- CreateTable
CREATE TABLE `Prediction` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `trainingRunId` VARCHAR(191) NULL,
    `target` VARCHAR(191) NULL,
    `horizon` INTEGER NULL,
    `payloadJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Prediction_modelId_createdAt_idx`(`modelId`, `createdAt`),
    INDEX `Prediction_trainingRunId_idx`(`trainingRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prediction` ADD CONSTRAINT `Prediction_trainingRunId_fkey` FOREIGN KEY (`trainingRunId`) REFERENCES `TrainingRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

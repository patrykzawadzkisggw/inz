-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Model` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('chronos', 'morai', 'timegpt') NOT NULL,
    `mode` ENUM('pretrained', 'custom') NOT NULL,
    `status` ENUM('draft', 'training', 'trained', 'deployed') NOT NULL DEFAULT 'draft',
    `enableUpdates` BOOLEAN NOT NULL DEFAULT true,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Model_status_idx`(`status`),
    INDEX `Model_type_mode_idx`(`type`, `mode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainingRun` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `metricsJson` JSON NULL,
    `mae` DOUBLE NULL,
    `rmse` DOUBLE NULL,
    `mape` DOUBLE NULL,
    `r2` DOUBLE NULL,
    `logSnippet` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrainingRun_modelId_status_idx`(`modelId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataFeed` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `kind` ENUM('API', 'MANUAL', 'FILE') NOT NULL,
    `endpointUrl` VARCHAR(191) NULL,
    `intervalSpec` VARCHAR(191) NULL,
    `processingScript` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DataFeed_modelId_active_idx`(`modelId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataImport` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NULL,
    `phase` ENUM('INITIAL', 'UPDATE', 'MANUAL') NOT NULL,
    `sourceKind` ENUM('API', 'MANUAL', 'FILE') NOT NULL,
    `sourceRef` VARCHAR(191) NULL,
    `rowCount` INTEGER NULL,
    `scriptUsed` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DataImport_modelId_phase_idx`(`modelId`, `phase`),
    INDEX `DataImport_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModelDataRow` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `importId` VARCHAR(191) NULL,
    `sourceKind` ENUM('API', 'MANUAL', 'FILE') NOT NULL,
    `ts` DATETIME(3) NULL,
    `payload` JSON NOT NULL,
    `versionTag` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ModelDataRow_modelId_ts_idx`(`modelId`, `ts`),
    INDEX `ModelDataRow_importId_idx`(`importId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `frequencyValue` INTEGER NULL,
    `frequencyUnit` VARCHAR(191) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `lastRunAt` DATETIME(3) NULL,
    `conditionFormula` VARCHAR(191) NULL,
    `messageTemplate` VARCHAR(191) NULL,

    INDEX `Report_enabled_idx`(`enabled`),
    INDEX `Report_nextRunAt_idx`(`nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomFunction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `body2` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomFunction_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Widget` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `type` ENUM('TEXT', 'CHART', 'TABLE') NOT NULL,
    `title` VARCHAR(191) NULL,
    `x` INTEGER NOT NULL,
    `y` INTEGER NOT NULL,
    `w` INTEGER NOT NULL,
    `h` INTEGER NOT NULL,
    `content` VARCHAR(191) NULL,
    `dataQuery` VARCHAR(191) NULL,
    `configJson` JSON NULL,
    `order` INTEGER NULL,
    `cacheJson` JSON NULL,
    `cacheTs` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Widget_userId_y_x_idx`(`userId`, `y`, `x`),
    INDEX `Widget_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Log` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('MODEL_TRAINING', 'MODEL_PREDICTION', 'REPORT', 'FUNCTION', 'SYSTEM', 'WIDGET') NOT NULL,
    `level` ENUM('INFO', 'WARN', 'ERROR') NOT NULL DEFAULT 'INFO',
    `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `modelId` VARCHAR(191) NULL,
    `trainingRunId` VARCHAR(191) NULL,
    `reportId` VARCHAR(191) NULL,
    `functionId` VARCHAR(191) NULL,
    `widgetId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Log_entityType_ts_idx`(`entityType`, `ts`),
    INDEX `Log_modelId_ts_idx`(`modelId`, `ts`),
    INDEX `Log_reportId_ts_idx`(`reportId`, `ts`),
    INDEX `Log_functionId_ts_idx`(`functionId`, `ts`),
    INDEX `Log_widgetId_ts_idx`(`widgetId`, `ts`),
    INDEX `Log_trainingRunId_idx`(`trainingRunId`),
    INDEX `Log_level_idx`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Model` ADD CONSTRAINT `Model_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainingRun` ADD CONSTRAINT `TrainingRun_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataFeed` ADD CONSTRAINT `DataFeed_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataImport` ADD CONSTRAINT `DataImport_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModelDataRow` ADD CONSTRAINT `ModelDataRow_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModelDataRow` ADD CONSTRAINT `ModelDataRow_importId_fkey` FOREIGN KEY (`importId`) REFERENCES `DataImport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomFunction` ADD CONSTRAINT `CustomFunction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Widget` ADD CONSTRAINT `Widget_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `Model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_trainingRunId_fkey` FOREIGN KEY (`trainingRunId`) REFERENCES `TrainingRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_functionId_fkey` FOREIGN KEY (`functionId`) REFERENCES `CustomFunction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Log` ADD CONSTRAINT `Log_widgetId_fkey` FOREIGN KEY (`widgetId`) REFERENCES `Widget`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

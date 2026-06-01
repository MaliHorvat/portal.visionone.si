-- Urejanje spletne strani visionone.si iz portala (phpMyAdmin / ročno)
CREATE TABLE IF NOT EXISTS `MarketingSiteContent` (
  `id` VARCHAR(191) NOT NULL,
  `content` JSON NOT NULL,
  `updatedBy` VARCHAR(191) NOT NULL DEFAULT '',
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

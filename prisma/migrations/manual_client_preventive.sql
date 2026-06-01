-- Preventiva za stranke + moj.visionone.si — ročno v phpMyAdmin (baza: visionone_database)

ALTER TABLE `Client`
  ADD COLUMN IF NOT EXISTS `diskReplaceDueDate` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `diskReplaceNote` TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS `preventiveInspectionDueDate` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `preventiveInspectionNote` TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS `clientPreventiveExtra` JSON NOT NULL DEFAULT ('[]');

ALTER TABLE `MaintenanceReminder`
  ADD COLUMN IF NOT EXISTS `clientVisible` TINYINT(1) NOT NULL DEFAULT 1;

-- Varianta B (starejši MySQL — po en stolpec):
-- ALTER TABLE `Client` ADD COLUMN `diskReplaceDueDate` VARCHAR(191) NOT NULL DEFAULT '';
-- ALTER TABLE `Client` ADD COLUMN `diskReplaceNote` TEXT NOT NULL;
-- ALTER TABLE `Client` ADD COLUMN `preventiveInspectionDueDate` VARCHAR(191) NOT NULL DEFAULT '';
-- ALTER TABLE `Client` ADD COLUMN `preventiveInspectionNote` TEXT NOT NULL;
-- ALTER TABLE `Client` ADD COLUMN `clientPreventiveExtra` JSON NOT NULL;
-- ALTER TABLE `MaintenanceReminder` ADD COLUMN `clientVisible` TINYINT(1) NOT NULL DEFAULT 1;

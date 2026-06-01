-- VisionOne Care Box — ročno v phpMyAdmin (baza: visionone_database)
-- Izberite bazo levo, zavihek SQL, prilepite in kliknite Izvedi.

-- Varianta A (MariaDB / MySQL 8.0.12+):
ALTER TABLE `Client`
  ADD COLUMN IF NOT EXISTS `careBoxEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `careSlaTier` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS `careRemoteNotes` TEXT NOT NULL DEFAULT ('');

ALTER TABLE `TelemetryAgent`
  ADD COLUMN IF NOT EXISTS `agentKind` VARCHAR(191) NOT NULL DEFAULT 'standard';

-- Če dobite napako "IF NOT EXISTS" ali "Duplicate column", uporabite Varianto B spodaj
-- (po en stolpec; vrstice s stolpcem, ki že obstaja, preskočite).

-- Varianta B (starejši MySQL — poženite samo tiste, ki še ne obstajajo):
-- ALTER TABLE `Client` ADD COLUMN `careBoxEnabled` TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE `Client` ADD COLUMN `careSlaTier` VARCHAR(191) NOT NULL DEFAULT '';
-- ALTER TABLE `Client` ADD COLUMN `careRemoteNotes` TEXT NOT NULL;
-- ALTER TABLE `TelemetryAgent` ADD COLUMN `agentKind` VARCHAR(191) NOT NULL DEFAULT 'standard';

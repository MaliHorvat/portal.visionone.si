-- Ročno: moj.visionone.si — vklop spremljanja statusa za stranko
ALTER TABLE `Client`
  ADD COLUMN `mojPortalEnabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `careBoxEnabled`;

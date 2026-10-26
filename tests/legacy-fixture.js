// Ustvari SQLite bazo s tabelami prejšnjega portala (za preizkus uvoza)
import { DatabaseSync } from 'node:sqlite';
export function createLegacyDb(file) {
const db = new DatabaseSync(file);
db.exec(`
CREATE TABLE "SubscriptionPackage"(id TEXT PRIMARY KEY, name TEXT, price REAL, description TEXT);
CREATE TABLE "Client"(id TEXT PRIMARY KEY, slug TEXT, name TEXT, address TEXT, contact TEXT, phone TEXT, email TEXT, ownerUsername TEXT, sortOrder INT, health TEXT, packageId TEXT, tags TEXT, careBoxEnabled INT, careSlaTier TEXT, careRemoteNotes TEXT, diskReplaceDueDate TEXT, diskReplaceNote TEXT, preventiveInspectionDueDate TEXT, preventiveInspectionNote TEXT, createdAt TEXT);
CREATE TABLE "ClientCamera"(id TEXT, clientId TEXT, name TEXT, ip TEXT, model TEXT, status TEXT, checkPort INT, rtspUser TEXT, rtspPass TEXT, streamUrl TEXT, comment TEXT, tag TEXT);
CREATE TABLE "ClientRecorder"(id TEXT, clientId TEXT, name TEXT, ip TEXT, model TEXT, status TEXT, diskTb REAL, comment TEXT);
CREATE TABLE "ClientSwitch"(id TEXT, clientId TEXT, name TEXT, ip TEXT, model TEXT, status TEXT, ports INT, comment TEXT);
CREATE TABLE "ClientDisk"(id TEXT, clientId TEXT, label TEXT, ip TEXT, model TEXT, sizeTb REAL, installedAt TEXT, health TEXT, serial TEXT, comment TEXT);
CREATE TABLE "ClientProfileNote"(clientId TEXT PRIMARY KEY, content TEXT);
CREATE TABLE "ClientDocument"(id TEXT, clientId TEXT, folder TEXT, originalName TEXT, mimeType TEXT, sizeBytes INT, data BLOB, createdAt TEXT);
CREATE TABLE "MaintenanceReminder"(id TEXT, clientId TEXT, title TEXT, dueDate TEXT, kind TEXT, completed INT);
INSERT INTO "SubscriptionPackage" VALUES ('p1','Osnovni',19.9,'');
INSERT INTO "Client" VALUES ('c1','zlatarna','Zlatarna Novak d.o.o.','Prešernova 5, 1000 Ljubljana','Marko Novak','040 111 222','marko@novak.si','admin',1,'ok','p1','["VIP","teren"]',1,'priority','Ključ pri sosedu','2027-03-01','Disk 6 let','','','2025-04-02 10:11:12.000');
INSERT INTO "Client" VALUES ('c2',NULL,'Janez Kranjc','Cesta 3, Kranj','','041 333 444','','admin',2,'alarm',NULL,'[]',0,'','','','','2026-11-15','Letni pregled','2025-06-01 08:00:00.000');
INSERT INTO "ClientCamera" VALUES ('k1','c1','Vhod','192.168.1.50','DS-2CD2043','online',80,'admin','Tajno123!','rtsp://192.168.1.50/Streaming/101','nad vrati','zunaj');
INSERT INTO "ClientCamera" VALUES ('k2','c1','Blagajna','192.168.1.51','DS-2CD2143','offline',NULL,'','','','','');
INSERT INTO "ClientRecorder" VALUES ('r1','c1','NVR','192.168.1.10','DS-7608','online',4,'omara');
INSERT INTO "ClientSwitch" VALUES ('s1','c1','PoE stikalo','192.168.1.2','TL-SG1008P','online',8,'');
INSERT INTO "ClientDisk" VALUES ('d1','c1','HDD 1','', 'WD Purple',4,'2022-05-10','warn','WX123','');
INSERT INTO "ClientProfileNote" VALUES ('c1','Stranka plačuje redno.');
INSERT INTO "ClientDocument" VALUES ('f1','c1','Pogodbe','pogodba.pdf','application/pdf',9,CAST('%PDF-1.4x' AS BLOB),'2025-05-01 09:00:00.000');
INSERT INTO "MaintenanceReminder" VALUES ('m1','c2','Letni servis','2026-10-26','servis',0);
`);
db.close();
}

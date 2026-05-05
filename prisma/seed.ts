import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const packages = await Promise.all([
    prisma.subscriptionPackage.upsert({
      where: { name: "Osnovni" },
      update: { price: 29, description: "Temeljni paket vzdrževanja." },
      create: { name: "Osnovni", price: 29, description: "Temeljni paket vzdrževanja." },
    }),
    prisma.subscriptionPackage.upsert({
      where: { name: "Napredni" },
      update: { price: 59, description: "Razširjeno spremljanje + hitri odziv." },
      create: { name: "Napredni", price: 59, description: "Razširjeno spremljanje + hitri odziv." },
    }),
    prisma.subscriptionPackage.upsert({
      where: { name: "Proaktivni" },
      update: { price: 99, description: "24/7 proaktivna podpora in SLA." },
      create: { name: "Proaktivni", price: 99, description: "24/7 proaktivna podpora in SLA." },
    }),
  ]);

  const napredni = packages.find((p) => p.name === "Napredni");
  const proaktivni = packages.find((p) => p.name === "Proaktivni");
  const osnovni = packages.find((p) => p.name === "Osnovni");

  const c1 = await prisma.client.upsert({
    where: { id: "seed-c1" },
    update: {},
    create: {
      id: "seed-c1",
      name: "Logistika Kranj d.o.o.",
      address: "Industrijska cesta 14, 4000 Kranj",
      contact: "Janez Novak",
      email: "j.novak@logistika-kranj.si",
      health: "ok",
      packageId: napredni?.id ?? null,
      cameras: {
        create: [
          { name: "Vhod sever", ip: "10.20.1.50", model: "Axis P3265", status: "online" },
          { name: "Rampni prostor", ip: "10.20.1.51", model: "Hikvision DS-2CD2xxx", status: "online" },
        ],
      },
      recorders: {
        create: [
          { name: "NVR glavni", ip: "10.20.1.10", model: "Hikvision 7732", status: "online", diskTb: 48 },
        ],
      },
      switches: {
        create: [
          { name: "Switch skladišče", ip: "10.20.1.2", model: "UniFi US-24", status: "online", ports: 24 },
        ],
      },
      disks: {
        create: [
          { label: "SATA RAID1", sizeTb: 24, installedAt: "2024-03-01", health: "ok" },
          { label: "SATA RAID1", sizeTb: 24, installedAt: "2024-03-01", health: "ok" },
        ],
      },
    },
  });

  const c2 = await prisma.client.upsert({
    where: { id: "seed-c2" },
    update: {},
    create: {
      id: "seed-c2",
      name: "Retail Park Maribor",
      address: "Trgovski center 3, 2000 Maribor",
      contact: "Ana Kovač",
      email: "ana.kovac@retailpark.si",
      health: "alarm",
      packageId: proaktivni?.id ?? null,
      cameras: {
        create: [
          { name: "Vhod zahod", ip: "10.50.2.18", model: "Dahua IPC-HFW", status: "offline" },
          { name: "Parking", ip: "10.50.2.19", model: "Dahua IPC-HFW", status: "online" },
        ],
      },
      recorders: {
        create: [
          { name: "NVR retail", ip: "10.50.2.5", model: "Dahua NVR5xxx", status: "online", diskTb: 32 },
        ],
      },
      switches: {
        create: [
          { name: "PoE switch L2", ip: "10.50.2.1", model: "TP-Link SG3428", status: "online", ports: 28 },
        ],
      },
      disks: {
        create: [
          { label: "Disk 1", sizeTb: 8, installedAt: "2025-01-10", health: "ok" },
          { label: "Disk 2", sizeTb: 8, installedAt: "2025-01-10", health: "warn" },
        ],
      },
    },
  });

  const c3 = await prisma.client.upsert({
    where: { id: "seed-c3" },
    update: {},
    create: {
      id: "seed-c3",
      name: "Stanovanjsko podjetje",
      address: "Celovška 100, 1000 Ljubljana",
      contact: "Upravnik",
      email: "uprava@stanovanja.si",
      health: "ok",
      packageId: osnovni?.id ?? null,
      cameras: {
        create: [{ name: "Dvigalo A", ip: "192.168.88.40", model: "Ubiquiti G4", status: "online" }],
      },
      recorders: {
        create: [
          { name: "NVR CloudKey", ip: "192.168.88.1", model: "UniFi CK+", status: "online", diskTb: 8 },
        ],
      },
      switches: {
        create: [
          { name: "Mini switch", ip: "192.168.88.2", model: "UniFi Flex", status: "online", ports: 5 },
        ],
      },
      disks: {
        create: [{ label: "SSD", sizeTb: 8, installedAt: "2023-11-20", health: "ok" }],
      },
    },
  });

  await prisma.maintenanceReminder.createMany({
    data: [
      {
        clientId: c1.id,
        title: "Čiščenje objektivov kamer (vhod)",
        dueDate: "2026-05-12",
        kind: "ciscenje_kamer",
      },
      {
        clientId: c2.id,
        title: "Preveritev diskov NVR + SMART",
        dueDate: "2026-05-18",
        kind: "diski",
      },
      {
        clientId: c3.id,
        title: "Letni servis domofona",
        dueDate: "2026-06-02",
        kind: "servis",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed: ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import type {
  ClientDetail,
  DashboardStats,
  InventoryItem,
  MaintenanceReminder,
  OfferLine,
  SiteTrafficLight,
  SubscriptionPackageDto,
  SystemEvent,
  TimeLogEntry,
  TopologyEdge,
  TopologyNode,
  RackUnit,
} from "./types";

export const mockDashboardStats: DashboardStats = {
  activeClients: 24,
  camerasOnline: 186,
  camerasOffline: 4,
  nvrsOnline: 22,
  nvrsOffline: 1,
};

export const mockSiteTraffic: SiteTrafficLight[] = [
  {
    clientId: "c1",
    clientName: "Logistika Kranj d.o.o.",
    state: "ok",
    detail: "Vse kamere in NVR online.",
  },
  {
    clientId: "c2",
    clientName: "Retail Park Maribor",
    state: "alarm",
    detail: "Kamera vhod zahod — brez odziva.",
  },
  {
    clientId: "c3",
    clientName: "Stanovanjsko podjetje",
    state: "ok",
    detail: "NVR disk 92 % zasedenosti.",
  },
  {
    clientId: "c4",
    clientName: "Proizvodnja Celje",
    state: "ok",
    detail: "Stikalo jedro — vsi porti OK.",
  },
];

export const mockSystemEvents: SystemEvent[] = [
  {
    id: "e1",
    at: "2026-05-04T14:22:00",
    level: "error",
    message: "Kamera CAM-12 offline (timeout ping)",
    clientId: "c2",
  },
  {
    id: "e2",
    at: "2026-05-04T13:05:00",
    level: "warn",
    message: "NVR disk SMART opozorilo — stranka c3",
    clientId: "c3",
  },
  {
    id: "e3",
    at: "2026-05-04T11:40:00",
    level: "info",
    message: "Firmware posodobljen: switch jedro (c4)",
    clientId: "c4",
  },
  {
    id: "e4",
    at: "2026-05-04T09:15:00",
    level: "info",
    message: "Nočni health check — brez anomalij",
  },
];

export const mockPackages: SubscriptionPackageDto[] = [
  { id: "pkg-osnovni", name: "Osnovni", price: 29, description: "Temeljni paket vzdrževanja." },
  { id: "pkg-napredni", name: "Napredni", price: 59, description: "Razširjeno spremljanje + hitri odziv." },
  { id: "pkg-proaktivni", name: "Proaktivni", price: 99, description: "24/7 proaktivna podpora in SLA." },
];

const baseClients: ClientDetail[] = [
  {
    id: "c1",
    name: "Logistika Kranj d.o.o.",
    address: "Industrijska cesta 14, 4000 Kranj",
    contact: "Janez Novak",
    email: "j.novak@logistika-kranj.si",
    package: mockPackages[1],
    health: "ok",
    cameras: [
      { id: "cam1", name: "Vhod sever", ip: "10.20.1.50", model: "Axis P3265", status: "online" },
      { id: "cam2", name: "Rampni prostor", ip: "10.20.1.51", model: "Hikvision DS-2CD2xxx", status: "online" },
    ],
    nvrs: [
      { id: "nvr1", name: "NVR glavni", ip: "10.20.1.10", model: "Hikvision 7732", status: "online", diskTb: 48 },
    ],
    switches: [
      { id: "sw1", name: "Switch skladišče", ip: "10.20.1.2", model: "UniFi US-24", status: "online", ports: 24 },
    ],
    disks: [
      { id: "d1", label: "SATA RAID1", sizeTb: 24, installedAt: "2024-03-01", health: "ok" },
      { id: "d2", label: "SATA RAID1", sizeTb: 24, installedAt: "2024-03-01", health: "ok" },
    ],
  },
  {
    id: "c2",
    name: "Retail Park Maribor",
    address: "Trgovski center 3, 2000 Maribor",
    contact: "Ana Kovač",
    email: "ana.kovac@retailpark.si",
    package: mockPackages[2],
    health: "alarm",
    cameras: [
      { id: "cam10", name: "Vhod zahod", ip: "10.50.2.18", model: "Dahua IPC-HFW", status: "offline" },
      { id: "cam11", name: "Parking", ip: "10.50.2.19", model: "Dahua IPC-HFW", status: "online" },
    ],
    nvrs: [
      { id: "nvr2", name: "NVR retail", ip: "10.50.2.5", model: "Dahua NVR5xxx", status: "online", diskTb: 32 },
    ],
    switches: [
      { id: "sw2", name: "PoE switch L2", ip: "10.50.2.1", model: "TP-Link SG3428", status: "online", ports: 28 },
    ],
    disks: [
      { id: "d3", label: "Disk 1", sizeTb: 8, installedAt: "2025-01-10", health: "ok" },
      { id: "d4", label: "Disk 2", sizeTb: 8, installedAt: "2025-01-10", health: "warn" },
    ],
  },
  {
    id: "c3",
    name: "Stanovanjsko podjetje",
    address: "Celovška 100, 1000 Ljubljana",
    contact: "Upravnik",
    email: "uprava@stanovanja.si",
    package: mockPackages[0],
    health: "ok",
    cameras: [
      { id: "cam20", name: "Dvigalo A", ip: "192.168.88.40", model: "Ubiquiti G4", status: "online" },
    ],
    nvrs: [
      { id: "nvr3", name: "NVR CloudKey", ip: "192.168.88.1", model: "UniFi CK+", status: "online", diskTb: 8 },
    ],
    switches: [
      { id: "sw3", name: "Mini switch", ip: "192.168.88.2", model: "UniFi Flex", status: "online", ports: 5 },
    ],
    disks: [{ id: "d5", label: "SSD", sizeTb: 8, installedAt: "2023-11-20", health: "ok" }],
  },
];

export function getMockClients(): ClientDetail[] {
  return baseClients;
}

export function getMockClient(id: string): ClientDetail | undefined {
  return baseClients.find((c) => c.id === id);
}

/** Demo stranka za Client pogled — filtrirano na c1 */
export const mockClientPortalClientId = "c1";

export const mockTopologyNodes: TopologyNode[] = [
  { id: "inet", label: "Internet", type: "internet", x: 50, y: 120 },
  { id: "r1", label: "Router", type: "router", x: 200, y: 120 },
  { id: "s1", label: "Switch PoE", type: "switch", x: 360, y: 60 },
  { id: "s2", label: "Switch L2", type: "switch", x: 360, y: 180 },
  { id: "nvr1", label: "NVR", type: "nvr", x: 520, y: 60 },
  { id: "cam1", label: "Kamera 1", type: "camera", x: 680, y: 20 },
  { id: "cam2", label: "Kamera 2", type: "camera", x: 680, y: 100 },
  { id: "cam3", label: "Kamera 3", type: "camera", x: 680, y: 180 },
];

export const mockTopologyEdges: TopologyEdge[] = [
  { from: "inet", to: "r1" },
  { from: "r1", to: "s1" },
  { from: "r1", to: "s2" },
  { from: "s1", to: "nvr1" },
  { from: "s1", to: "cam1" },
  { from: "s1", to: "cam2" },
  { from: "s2", to: "cam3" },
];

export const mockRackUnits: RackUnit[] = [
  { uStart: 1, uSpan: 1, label: "Patch panel", deviceType: "panel" },
  { uStart: 2, uSpan: 1, label: "Router / firewall", deviceType: "router" },
  { uStart: 4, uSpan: 2, label: "Switch 24p PoE+", deviceType: "switch" },
  { uStart: 7, uSpan: 2, label: "NVR 32ch", deviceType: "nvr" },
  { uStart: 10, uSpan: 1, label: "UPS 1500VA", deviceType: "ups" },
];

export const mockOfferLines: OfferLine[] = [
  { id: "l1", code: "CAM-AXIS", description: "Montaža kamere Axis P32 + kabliranje", qty: 4, unitPrice: 420, discountPct: 0 },
  { id: "l2", code: "NVR-HIK", description: "NVR 32 kanala + konfiguracija", qty: 1, unitPrice: 1850, discountPct: 5 },
  { id: "l3", code: "SW-POE", description: "Stikalo 24p PoE", qty: 2, unitPrice: 680, discountPct: 0 },
];

export const mockInventory: InventoryItem[] = [
  { id: "i1", sku: "CAM-DAH-2CD", name: "Kamera Dahua 4MP bullet", qty: 12, minQty: 4, unit: "kos" },
  { id: "i2", sku: "HDD-8TB", name: "Disk SATA 8TB surveillance", qty: 6, minQty: 4, unit: "kos" },
  { id: "i3", sku: "PATCH-CAT6", name: "Patch kabel Cat6 1m", qty: 80, minQty: 40, unit: "kos" },
  { id: "i4", sku: "SW-24-POE", name: "Stikalo 24p PoE+", qty: 2, minQty: 2, unit: "kos" },
];

export const mockReminders: MaintenanceReminder[] = [
  {
    id: "r1",
    clientId: "c1",
    clientName: "Logistika Kranj d.o.o.",
    title: "Čiščenje objektivov kamer (vhod)",
    dueDate: "2026-05-12",
    kind: "ciscenje_kamer",
    completed: false,
  },
  {
    id: "r2",
    clientId: "c2",
    clientName: "Retail Park Maribor",
    title: "Preveritev diskov NVR + SMART",
    dueDate: "2026-05-18",
    kind: "diski",
    completed: false,
  },
  {
    id: "r3",
    clientId: "c3",
    clientName: "Stanovanjsko podjetje",
    title: "Letni servis domofona",
    dueDate: "2026-06-02",
    kind: "servis",
    completed: false,
  },
];

export const mockTimeLogs: TimeLogEntry[] = [
  {
    id: "t1",
    projectId: "c2",
    projectName: "Retail Park Maribor",
    date: "2026-05-03",
    hours: 5.5,
    note: "Diagnoza offline kamere, zamenjava PoE porta",
  },
  {
    id: "t2",
    projectId: "c1",
    projectName: "Logistika Kranj d.o.o.",
    date: "2026-05-02",
    hours: 3,
    note: "Razširitev snemanja na nov disk",
  },
];

/** Domenski tipi za VisionOne portal. Usklajeno z app.go strukturami. */

export type DeviceStatus = "online" | "offline" | "alarm";
export type ClientHealth = "ok" | "alarm";
export type DiskHealth = "ok" | "warn" | "fail";

export interface SubscriptionPackageDto {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  package: SubscriptionPackageDto | null;
  health: ClientHealth;
}

export interface CameraDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: DeviceStatus;
}

export interface NvrDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: DeviceStatus;
  diskTb: number;
}

export interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: DeviceStatus;
  ports: number;
}

export interface DiskEntry {
  id: string;
  label: string;
  sizeTb: number;
  installedAt: string;
  health: DiskHealth;
}

export interface ClientDetail extends ClientSummary {
  cameras: CameraDevice[];
  nvrs: NvrDevice[];
  switches: SwitchDevice[];
  disks: DiskEntry[];
}

export interface TopologyNode {
  id: string;
  label: string;
  type: "router" | "switch" | "camera" | "nvr" | "internet";
  x: number;
  y: number;
}

export interface TopologyEdge {
  from: string;
  to: string;
}

export interface RackUnit {
  uStart: number;
  uSpan: number;
  label: string;
  deviceType: string;
}

export interface DashboardStats {
  activeClients: number;
  camerasOnline: number;
  camerasOffline: number;
  nvrsOnline: number;
  nvrsOffline: number;
}

export interface SystemEvent {
  id: string;
  at: string;
  level: "info" | "warn" | "error";
  message: string;
  clientId?: string;
}

export interface OfferLine {
  id: string;
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  minQty: number;
  unit: string;
}

export type ReminderKind = "ciscenje_kamer" | "diski" | "servis" | "drugo";

export interface MaintenanceReminder {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  dueDate: string;
  kind: ReminderKind;
  completed: boolean;
}

export interface TimeLogEntry {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  hours: number;
  note: string;
}

export interface SiteTrafficLight {
  clientId: string;
  clientName: string;
  state: "ok" | "alarm";
  detail: string;
}

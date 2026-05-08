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
  /** Za URL /portal/stranke/[slug]; če null, se uporabi id. */
  slug: string | null;
  name: string;
  address: string;
  contact: string;
  phone: string;
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
  checkPort?: number | null;
  rtspUser?: string;
  rtspPass?: string;
  streamUrl?: string;
  comment?: string;
  tag?: string;
}

export interface NvrDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: DeviceStatus;
  diskTb: number;
  comment?: string;
}

export interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: DeviceStatus;
  ports: number;
  comment?: string;
}

export interface DiskEntry {
  id: string;
  label: string;
  ip?: string;
  model?: string;
  sizeTb: number;
  installedAt: string;
  health: DiskHealth;
  serial?: string;
  comment?: string;
}

export interface ClientDetail extends ClientSummary {
  cameras: CameraDevice[];
  nvrs: NvrDevice[];
  switches: SwitchDevice[];
  disks: DiskEntry[];
  topologyData?: unknown | null;
  rackData?: unknown | null;
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
  unit?: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  lineVatPct?: number;
}

/** Shema / načrt — shranjeno v Client.topologyData */
export type TopologyDeviceKind = "camera" | "recorder" | "switch" | "disk";

/** Načrt vstavitve kamere (kot na risbah pokritosti). */
export interface CameraPlanOverlay {
  /** Številka na označevalcu (npr. 1, 2, 3). */
  badge?: number;
  mountHeightM?: number;
  tiltDeg?: number;
  /** Horizontalni kot vidnega polja (stopinje). */
  fovDeg?: number;
  /** Dolžina „stožca“ na platnu v slikovnih pikah. */
  reachPx?: number;
}

export interface TopologyCanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  rotationDeg?: number;
  deviceRef?: { kind: TopologyDeviceKind; id: string };
  cameraPlan?: CameraPlanOverlay;
}

export interface TopologyCanvasEdge {
  from: string;
  to: string;
}

export interface ClientTopologyState {
  nodes: TopologyCanvasNode[];
  edges: TopologyCanvasEdge[];
  /** Ročno narisane linije tlorisa v shemi. */
  floorPlanPaths?: Array<{ points: Array<{ x: number; y: number }> }>;
  /** Opcijsko satelitsko / ortofoto ozadje (URL). */
  planBackgroundUrl?: string;
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

export type ProbeKind = "camera" | "nvr" | "switch" | "router" | "host" | "other";
export type ProbeStatus = "online" | "offline";

export interface TelemetryIngestDevice {
  key: string;
  name: string;
  ip: string;
  kind: ProbeKind;
  reachable: boolean;
  latencyMs?: number;
  error?: string;
}

export interface TelemetryIngestPayload {
  agentId: string;
  agentName?: string;
  siteLabel?: string;
  clientId?: string;
  checkedAt?: string;
  devices: TelemetryIngestDevice[];
}

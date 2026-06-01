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

export type PreventiveItemKind =
  | "menjava_diska"
  | "preventivni_pregled"
  | "fw_posodobitev"
  | "baterije_ups"
  | "pregled_sistema"
  | "certifikati"
  | "drugo";

export interface ClientPreventiveExtraItem {
  id: string;
  title: string;
  dueDate: string;
  kind: PreventiveItemKind;
  note: string;
}

export interface ClientPreventivePlan {
  diskReplaceDueDate: string;
  diskReplaceNote: string;
  preventiveInspectionDueDate: string;
  preventiveInspectionNote: string;
  extraItems: ClientPreventiveExtraItem[];
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
  /** Oznake stranke (npr. VIP, teren). */
  tags: string[];
  careBoxEnabled?: boolean;
  careSlaTier?: string;
  preventive: ClientPreventivePlan;
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
  /** Poenostavljen prikaz „DORI“ obročev znotraj FOV (orientacijski model, ne certifikacija). */
  showDoriZones?: boolean;
  /** Dodaten črtkan lok za oceno IR/nočnega dosega (px na platnu). */
  irReachPx?: number;
}

export interface TopologyCanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  rotationDeg?: number;
  deviceRef?: { kind: TopologyDeviceKind; id: string };
  cameraPlan?: CameraPlanOverlay;
  /** Vizualna ikona na shemi (npr. camera-dome, raspberry). */
  iconKey?: string;
  appearance?: {
    displayName?: string;
    iconColor?: string;
    iconSizePx?: number;
    showFov?: boolean;
    fovColor?: string;
  };
  /** IP, model … ko ni v inventarju ali kot lokalni override. */
  planMeta?: {
    ip?: string;
    model?: string;
    manufacturer?: string;
    comment?: string;
    floor?: string;
    mac?: string;
    ports?: number;
    rtspUser?: string;
    rtspPass?: string;
    photoBefore?: string;
    photoAfter?: string;
    photoNvr?: string;
    /** Zemljepisna širina (WGS84) za prikaz na zemljevidu. */
    geoLat?: number;
    /** Zemljepisna dolžina (WGS84). */
    geoLng?: number;
  };
}

/** Shranjeno stanje pogleda zemljevida v shemi. */
export interface SchemaMapViewState {
  centerLng: number;
  centerLat: number;
  zoom: number;
  style?: "streets" | "satellite";
}

export interface TopologyCanvasEdge {
  from: string;
  to: string;
  /** Npr. LAN, Cat6 */
  label?: string;
  cableType?: string;
}

/** Segment risbe: stena/tloris ali pot kabla (kot pri CCTV design kablih). */
export type FloorPlanStrokeKind = "wall" | "cable";

export interface FloorPlanPathEntry {
  points: Array<{ x: number; y: number }>;
  kind?: FloorPlanStrokeKind;
  /** Npr. Cat6, coax */
  cableType?: string;
}

/** Merilo načrta: metre na slikovno piko (za oceno dolžin kablov na risbi). */
export interface PlanCalibration {
  metersPerPx?: number;
}

export interface SchemaLayerVisibility {
  background?: boolean;
  walls?: boolean;
  cables?: boolean;
  fov?: boolean;
  devices?: boolean;
  edges?: boolean;
}

export interface ClientTopologyState {
  nodes: TopologyCanvasNode[];
  edges: TopologyCanvasEdge[];
  /** Ročno narisane črte (tloris, stene, kabli …). */
  floorPlanPaths?: FloorPlanPathEntry[];
  /** Ozadje kot HTTPS URL. */
  planBackgroundUrl?: string;
  /** Ozadje kot data URL (naložena slika JPG/PNG — omejena velikost v UI). */
  planBackgroundDataUrl?: string;
  planCalibration?: PlanCalibration;
  /** 0 = izklop mreže snap; npr. 16 ali 24 */
  snapGridPx?: number;
  /** Opombe projekta / lokacije na načrtu */
  planNotes?: string;
  layerVisibility?: SchemaLayerVisibility;
  /** Zunanji zemljevid (URL slike ali opomba) */
  mapBackgroundUrl?: string;
  /** Pogled MapLibre (središče, zoom). */
  mapView?: SchemaMapViewState;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  minQty: number;
  unit: string;
}

export type ReminderKind =
  | "ciscenje_kamer"
  | "diski"
  | "servis"
  | "menjava_diska"
  | "preventivni_pregled"
  | "fw_posodobitev"
  | "baterije_ups"
  | "pregled_sistema"
  | "certifikati"
  | "drugo";

export interface MaintenanceReminder {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  dueDate: string;
  kind: ReminderKind;
  completed: boolean;
  /** Vidno na moj.visionone.si */
  clientVisible: boolean;
}

export type ServiceRequestStatus = "new" | "in_progress" | "waiting_customer" | "done";
export type ServiceRequestPriority = "low" | "medium" | "high" | "urgent";

export interface ServiceRequest {
  id: string;
  ownerUsername: string;
  clientId: string | null;
  clientName: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
  dueDate: string;
  createdBy: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
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
  reachable?: boolean;
  /** Alternativa za reachable (agent pošilja status: online | offline). */
  status?: ProbeStatus;
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

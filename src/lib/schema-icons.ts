import type { TopologyDeviceKind } from "@/lib/types";

/** Ključ ikone na shemi (neodvisno od inventarja). */
export type SchemaIconKey =
  | "camera-bullet"
  | "camera-dome"
  | "camera-ptz"
  | "camera-fisheye"
  | "nvr"
  | "switch"
  | "router"
  | "disk"
  | "raspberry"
  | "pc"
  | "laptop"
  | "server"
  | "ap"
  | "poe"
  | "intercom"
  | "siren"
  | "keypad"
  | "ups"
  | "monitor"
  | "generic";

export const SCHEMA_ICON_KEYS: SchemaIconKey[] = [
  "camera-bullet",
  "camera-dome",
  "camera-ptz",
  "camera-fisheye",
  "nvr",
  "switch",
  "router",
  "disk",
  "raspberry",
  "pc",
  "laptop",
  "server",
  "ap",
  "poe",
  "intercom",
  "siren",
  "keypad",
  "ups",
  "monitor",
  "generic",
];

export const SCHEMA_FOV_COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
] as const;

export interface SchemaNodeAppearance {
  displayName?: string;
  iconColor?: string;
  iconSizePx?: number;
  showFov?: boolean;
  fovColor?: string;
}

/** Podatki na vozlišču, če ni vezano na inventar ali kot dopolnilo. */
export interface PlanNodeMeta {
  ip?: string;
  model?: string;
  manufacturer?: string;
  comment?: string;
  floor?: string;
  mac?: string;
  ports?: number;
  rtspUser?: string;
  rtspPass?: string;
}

export function defaultIconForDeviceKind(kind: TopologyDeviceKind): SchemaIconKey {
  switch (kind) {
    case "camera":
      return "camera-bullet";
    case "recorder":
      return "nvr";
    case "switch":
      return "switch";
    case "disk":
      return "disk";
    default:
      return "generic";
  }
}

export function isCameraIcon(key: SchemaIconKey): boolean {
  return key.startsWith("camera-");
}

export function parseSchemaIconKey(raw: unknown): SchemaIconKey | undefined {
  if (typeof raw === "string" && (SCHEMA_ICON_KEYS as string[]).includes(raw)) {
    return raw as SchemaIconKey;
  }
  return undefined;
}

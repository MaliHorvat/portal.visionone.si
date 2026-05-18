import type { SchemaIconKey } from "@/lib/schema-icons";

export type IconCatalogEntry = {
  key: SchemaIconKey;
  label: string;
  category: string;
  defaultColor: string;
};

export const ICON_CATALOG: IconCatalogEntry[] = [
  { key: "camera-bullet", label: "Kamera bullet", category: "Kamere", defaultColor: "#ef4444" },
  { key: "camera-dome", label: "Kamera dome", category: "Kamere", defaultColor: "#ec4899" },
  { key: "camera-ptz", label: "Kamera PTZ", category: "Kamere", defaultColor: "#f97316" },
  { key: "camera-fisheye", label: "Kamera fisheye", category: "Kamere", defaultColor: "#a855f7" },
  { key: "nvr", label: "Snemalnik / NVR", category: "Snemanje", defaultColor: "#eab308" },
  { key: "disk", label: "Disk", category: "Snemanje", defaultColor: "#ca8a04" },
  { key: "switch", label: "Switch", category: "Omrežje", defaultColor: "#b45309" },
  { key: "router", label: "Router", category: "Omrežje", defaultColor: "#3b82f6" },
  { key: "ap", label: "Access point", category: "Omrežje", defaultColor: "#0ea5e9" },
  { key: "poe", label: "PoE injector", category: "Omrežje", defaultColor: "#64748b" },
  { key: "raspberry", label: "Raspberry Pi", category: "Računalniki", defaultColor: "#22c55e" },
  { key: "pc", label: "Računalnik", category: "Računalniki", defaultColor: "#8b5cf6" },
  { key: "laptop", label: "Prenosnik", category: "Računalniki", defaultColor: "#6366f1" },
  { key: "server", label: "Strežnik", category: "Računalniki", defaultColor: "#f59e0b" },
  { key: "monitor", label: "Monitor", category: "Računalniki", defaultColor: "#475569" },
  { key: "intercom", label: "Interkom", category: "Varnost", defaultColor: "#14b8a6" },
  { key: "siren", label: "Sirena", category: "Varnost", defaultColor: "#dc2626" },
  { key: "keypad", label: "Tipkovnica", category: "Varnost", defaultColor: "#78716c" },
  { key: "ups", label: "UPS", category: "Napajanje", defaultColor: "#059669" },
  { key: "generic", label: "Splošno", category: "Ostalo", defaultColor: "#6b7280" },
];

export function catalogEntry(key: SchemaIconKey): IconCatalogEntry {
  return ICON_CATALOG.find((e) => e.key === key) ?? ICON_CATALOG[ICON_CATALOG.length - 1];
}

export const ICON_CATEGORIES = [...new Set(ICON_CATALOG.map((e) => e.category))];

export const NAV_PERMISSION_KEYS = [
  "dashboard",
  "vms",
  "kerberos-hub",
  "my-account",
  "clients",
  "offers",
  "time-tracking",
  "service-requests",
  "maintenance",
  "my-site",
  "rack-designer",
  "tools",
  "network-diagnostics",
  "devices-tools",
  "knowledge-base",
  "inventory",
  "agents",
  "notifications",
  "camera-definitions",
  "audit-log",
  "packages",
  "settings",
] as const;

export type NavPermissionKey = (typeof NAV_PERMISSION_KEYS)[number];

export const NAV_PERMISSION_LABELS: Record<NavPermissionKey, string> = {
  dashboard: "Nadzorna plošča",
  vms: "VMS / Kamere",
  "kerberos-hub": "Kerberos Hub",
  "my-account": "Moj račun",
  clients: "Objekti & stranke",
  offers: "Ponudbe",
  "time-tracking": "Sledenje času",
  "service-requests": "Zahtevki",
  maintenance: "Vzdrževanje",
  "my-site": "Moj objekt",
  "rack-designer": "Rack dizajner",
  tools: "Kalkulatorji / Orodja",
  "network-diagnostics": "Omrežje & diagnostika",
  "devices-tools": "Orodja & naprave",
  "knowledge-base": "Baza znanja",
  inventory: "Skladišče",
  agents: "Agenti",
  notifications: "Obvestila (Telegram)",
  "camera-definitions": "RTSP definicije",
  "audit-log": "Audit log",
  packages: "Naročniški paketi",
  settings: "Nastavitve",
};

export function getDefaultNavPermissions(role: "admin" | "operator" | "viewer"): NavPermissionKey[] {
  if (role === "admin") return [...NAV_PERMISSION_KEYS];
  if (role === "operator") {
    return [
      "dashboard",
      "vms",
      "kerberos-hub",
      "my-account",
      "service-requests",
      "maintenance",
      "my-site",
      "tools",
      "network-diagnostics",
      "devices-tools",
      "knowledge-base",
    ];
  }
  return ["dashboard", "vms", "kerberos-hub", "my-account", "service-requests", "maintenance", "my-site"];
}

export function normalizeNavPermissions(input: unknown, role: "admin" | "operator" | "viewer"): NavPermissionKey[] {
  if (!Array.isArray(input)) return getDefaultNavPermissions(role);
  const normalized = input
    .map((v) => String(v))
    .filter((v): v is NavPermissionKey => NAV_PERMISSION_KEYS.includes(v as NavPermissionKey));
  if (normalized.length === 0) return getDefaultNavPermissions(role);
  return Array.from(new Set(normalized));
}

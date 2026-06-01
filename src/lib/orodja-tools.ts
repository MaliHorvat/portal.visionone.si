/** Seznam orodij na /portal/orodja — skupna konfiguracija za navigacijo. */

export const ORODJA_TOOLS = [
  { id: "ip-scan", label: "LAN sken", mobileLabel: "LAN" },
  { id: "ipam", label: "IPAM", mobileLabel: "IPAM" },
  { id: "poe", label: "PoE", mobileLabel: "PoE" },
  { id: "storage", label: "Shramba", mobileLabel: "TB" },
  { id: "lcc", label: "LCC", mobileLabel: "LCC" },
  { id: "pw", label: "Gesla", mobileLabel: "Gesla" },
  { id: "mac", label: "MAC", mobileLabel: "MAC" },
  { id: "wol", label: "WoL", mobileLabel: "WoL" },
  { id: "ping", label: "Ping", mobileLabel: "Ping" },
  { id: "snapshot", label: "Snapshot", mobileLabel: "Snap" },
] as const;

export type OrodjaToolId = (typeof ORODJA_TOOLS)[number]["id"];

export function isOrodjaToolId(v: string | null): v is OrodjaToolId {
  return ORODJA_TOOLS.some((t) => t.id === v);
}

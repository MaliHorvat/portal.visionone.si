import type { SchemaIconKey } from "@/lib/schema-icons";
import type { ClientDetail } from "@/lib/types";

export type SchemaModelEntry = {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  iconKey: SchemaIconKey;
  defaultFovDeg?: number;
  tags: string[];
};

const BUILTIN: SchemaModelEntry[] = [
  { id: "dh-bullet2mp", manufacturer: "Dahua", model: "IPC-HFW2431T", category: "Kamera", iconKey: "camera-bullet", defaultFovDeg: 87, tags: ["2mp", "poe", "ir"] },
  { id: "dh-dome4mp", manufacturer: "Dahua", model: "IPC-HDBW3441R", category: "Kamera", iconKey: "camera-dome", defaultFovDeg: 103, tags: ["4mp", "vandal"] },
  { id: "dh-ptz", manufacturer: "Dahua", model: "SD49225", category: "Kamera", iconKey: "camera-ptz", defaultFovDeg: 55, tags: ["ptz", "25x"] },
  { id: "hik-bullet", manufacturer: "Hikvision", model: "DS-2CD2043G2", category: "Kamera", iconKey: "camera-bullet", defaultFovDeg: 103, tags: ["4mp", "acuSense"] },
  { id: "hik-dome", manufacturer: "Hikvision", model: "DS-2CD2143G2", category: "Kamera", iconKey: "camera-dome", defaultFovDeg: 103, tags: ["4mp", "dome"] },
  { id: "hik-fisheye", manufacturer: "Hikvision", model: "DS-2CD63C5G0", category: "Kamera", iconKey: "camera-fisheye", defaultFovDeg: 180, tags: ["panoramic"] },
  { id: "axis-dome", manufacturer: "Axis", model: "P3245-V", category: "Kamera", iconKey: "camera-dome", defaultFovDeg: 100, tags: ["zipstream"] },
  { id: "uniview-bullet", manufacturer: "Uniview", model: "IPC2122LB", category: "Kamera", iconKey: "camera-bullet", defaultFovDeg: 84, tags: ["2mp"] },
  { id: "dh-nvr8", manufacturer: "Dahua", model: "NVR4108", category: "Snemalnik", iconKey: "nvr", tags: ["8ch", "poe"] },
  { id: "hik-nvr16", manufacturer: "Hikvision", model: "DS-7616NI-K2", category: "Snemalnik", iconKey: "nvr", tags: ["16ch"] },
  { id: "ubnt-switch24", manufacturer: "Ubiquiti", model: "USW-24-PoE", category: "Omrežje", iconKey: "switch", tags: ["poe", "24port"] },
  { id: "cisco-switch", manufacturer: "Cisco", model: "SG350-28P", category: "Omrežje", iconKey: "switch", tags: ["poe", "managed"] },
  { id: "mikrotik-router", manufacturer: "MikroTik", model: "hEX S", category: "Omrežje", iconKey: "router", tags: ["router", "gigabit"] },
  { id: "tp-link-ap", manufacturer: "TP-Link", model: "EAP225", category: "Omrežje", iconKey: "ap", tags: ["wifi", "ap"] },
  { id: "rpi4", manufacturer: "Raspberry Pi", model: "4 Model B", category: "Računalnik", iconKey: "raspberry", tags: ["edge", "linux"] },
  { id: "wd-purple", manufacturer: "Western Digital", model: "WD Purple 8TB", category: "Disk", iconKey: "disk", tags: ["hdd", "surveillance"] },
  { id: "apc-ups", manufacturer: "APC", model: "Smart-UPS 1500", category: "Napajanje", iconKey: "ups", tags: ["ups"] },
  { id: "2n-intercom", manufacturer: "2N", model: "Helios IP", category: "Varnost", iconKey: "intercom", tags: ["intercom", "sip"] },
];

function entryFromDevice(
  manufacturer: string,
  model: string,
  category: string,
  iconKey: SchemaIconKey,
  suffix: string,
): SchemaModelEntry | null {
  const m = model.trim();
  if (!m) return null;
  const man = manufacturer.trim() || "Neznano";
  return {
    id: `client-${suffix}-${man}-${m}`.replace(/\s+/g, "-").toLowerCase(),
    manufacturer: man,
    model: m,
    category,
    iconKey,
    tags: [category.toLowerCase(), man.toLowerCase()],
  };
}

/** Združi vgrajeno knjižnico z modeli iz inventarja stranke. */
export function buildSchemaModelLibrary(client: ClientDetail): SchemaModelEntry[] {
  const map = new Map<string, SchemaModelEntry>();
  for (const e of BUILTIN) map.set(e.id, e);

  for (const c of client.cameras) {
    const e = entryFromDevice("", c.model ?? c.name, "Kamera", "camera-bullet", `cam-${c.id}`);
    if (e) map.set(e.id, e);
  }
  for (const r of client.nvrs) {
    const e = entryFromDevice("", r.model ?? r.name, "Snemalnik", "nvr", `nvr-${r.id}`);
    if (e) map.set(e.id, e);
  }
  for (const s of client.switches) {
    const e = entryFromDevice("", s.model ?? s.name, "Omrežje", "switch", `sw-${s.id}`);
    if (e) map.set(e.id, e);
  }
  for (const d of client.disks) {
    const e = entryFromDevice("", d.model ?? d.label, "Disk", "disk", `disk-${d.id}`);
    if (e) map.set(e.id, e);
  }

  return [...map.values()].sort((a, b) =>
    `${a.manufacturer} ${a.model}`.localeCompare(`${b.manufacturer} ${b.model}`, "sl"),
  );
}

export function searchSchemaModels(entries: SchemaModelEntry[], query: string): SchemaModelEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, 40);
  return entries
    .filter(
      (e) =>
        e.model.toLowerCase().includes(q) ||
        e.manufacturer.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)),
    )
    .slice(0, 40);
}

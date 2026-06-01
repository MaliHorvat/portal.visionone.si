import type {
  ClientPreventivePlan,
  ClientSummary,
  MaintenanceReminder,
  PreventiveItemKind,
  ReminderKind,
} from "@/lib/types";

export const emptyClientPreventive = (): ClientPreventivePlan => ({
  diskReplaceDueDate: "",
  diskReplaceNote: "",
  preventiveInspectionDueDate: "",
  preventiveInspectionNote: "",
  extraItems: [],
});

export const PREVENTIVE_KIND_LABELS: Record<PreventiveItemKind, string> = {
  menjava_diska: "Menjava diska",
  preventivni_pregled: "Preventivni pregled",
  fw_posodobitev: "Posodobitev programske opreme",
  baterije_ups: "Baterije / UPS",
  pregled_sistema: "Pregled sistema",
  certifikati: "Certifikati / licence",
  drugo: "Drugo",
};

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  ciscenje_kamer: "Čiščenje kamer",
  diski: "Diski / kapaciteta",
  servis: "Servis",
  menjava_diska: "Menjava diska",
  preventivni_pregled: "Preventivni pregled",
  fw_posodobitev: "Posodobitev FW",
  baterije_ups: "Baterije / UPS",
  pregled_sistema: "Pregled sistema",
  certifikati: "Certifikati",
  drugo: "Drugo",
};

export type MojPreventiveItem = {
  id: string;
  title: string;
  dueDate: string;
  kind: string;
  kindLabel: string;
  note: string;
  urgent: boolean;
  source: "disk" | "inspection" | "extra" | "reminder";
};

function daysUntil(dueDate: string): number | null {
  const d = dueDate.trim();
  if (!d) return null;
  const t = Date.parse(d.length <= 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

export function isPreventiveUrgent(dueDate: string): boolean {
  const left = daysUntil(dueDate);
  return left !== null && left <= 30;
}

export function parseClientPreventiveExtra(raw: unknown): ClientSummary["preventive"]["extraItems"] {
  if (!Array.isArray(raw)) return [];
  const kinds = new Set(Object.keys(PREVENTIVE_KIND_LABELS));
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const title = String(o.title ?? "").trim();
      const dueDate = String(o.dueDate ?? "").trim();
      if (!title || !dueDate) return null;
      const kindRaw = String(o.kind ?? "drugo");
      const kind = kinds.has(kindRaw) ? (kindRaw as PreventiveItemKind) : "drugo";
      return {
        id: String(o.id ?? `x-${title}-${dueDate}`),
        title,
        dueDate,
        kind,
        note: String(o.note ?? "").trim(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export function buildMojPreventiveItems(
  client: ClientSummary,
  reminders: MaintenanceReminder[],
): MojPreventiveItem[] {
  const items: MojPreventiveItem[] = [];
  const p = client.preventive;

  if (p.diskReplaceDueDate) {
    items.push({
      id: "disk-replace",
      title: "Priporočena menjava diska",
      dueDate: p.diskReplaceDueDate,
      kind: "menjava_diska",
      kindLabel: PREVENTIVE_KIND_LABELS.menjava_diska,
      note: p.diskReplaceNote,
      urgent: isPreventiveUrgent(p.diskReplaceDueDate),
      source: "disk",
    });
  }

  if (p.preventiveInspectionDueDate) {
    const noPackage = !client.package;
    items.push({
      id: "preventive-inspection",
      title: noPackage ? "Preventivni pregled (brez paketa vzdrževanja)" : "Preventivni pregled",
      dueDate: p.preventiveInspectionDueDate,
      kind: "preventivni_pregled",
      kindLabel: PREVENTIVE_KIND_LABELS.preventivni_pregled,
      note: p.preventiveInspectionNote,
      urgent: isPreventiveUrgent(p.preventiveInspectionDueDate) || noPackage,
      source: "inspection",
    });
  }

  for (const ex of p.extraItems) {
    items.push({
      id: ex.id,
      title: ex.title,
      dueDate: ex.dueDate,
      kind: ex.kind,
      kindLabel: PREVENTIVE_KIND_LABELS[ex.kind],
      note: ex.note,
      urgent: isPreventiveUrgent(ex.dueDate),
      source: "extra",
    });
  }

  for (const r of reminders) {
    if (r.completed) continue;
    items.push({
      id: `reminder-${r.id}`,
      title: r.title,
      dueDate: r.dueDate,
      kind: r.kind,
      kindLabel: REMINDER_KIND_LABELS[r.kind] ?? r.kind,
      note: "",
      urgent: isPreventiveUrgent(r.dueDate),
      source: "reminder",
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

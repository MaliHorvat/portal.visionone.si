export type DashboardWidgetType =
  | "care_box_alert"
  | "client_status"
  | "reminders"
  | "stats"
  | "activities"
  | "requests"
  | "system_bar"
  | "quick_actions"
  | "quick_links";

export type DashboardWidgetInstance = {
  id: string;
  type: DashboardWidgetType;
  /** Nastavitve posameznega widgeta (npr. filter opomnikov). */
  config: Record<string, unknown>;
};

export type DashboardLayout = {
  widgets: DashboardWidgetInstance[];
};

export type DashboardWidgetMeta = {
  type: DashboardWidgetType;
  title: string;
  description: string;
};

export const DASHBOARD_WIDGET_CATALOG: DashboardWidgetMeta[] = [
  { type: "care_box_alert", title: "Care Box opozorilo", description: "Pomembna obvestila o Care Box agentih." },
  { type: "client_status", title: "Status strank", description: "Kartice strank s stanjem kamer in opreme." },
  { type: "reminders", title: "Vzdrževanje & opomniki", description: "Seznam opomnikov za vzdrževanje." },
  { type: "stats", title: "Hiter pregled", description: "Skupne številke objektov, kamer, diskov, zahtevkov." },
  { type: "activities", title: "Zadnje aktivnosti", description: "Dnevnik dogodkov v sistemu." },
  { type: "requests", title: "Zahtevki (inbox)", description: "Odprti operativni zahtevki." },
  { type: "system_bar", title: "Status sistema", description: "Povezava API in verzija portala." },
  { type: "quick_actions", title: "Hitri dostopi", description: "Bližnjice do pogostih sekcij." },
  { type: "quick_links", title: "Hitre povezave", description: "Kartice do modulov portala." },
];

const LAYOUT_KEY = "vo-portal-dashboard-layout";

function newId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "w_care", type: "care_box_alert", config: {} },
    { id: "w_clients", type: "client_status", config: { favoritesOnly: false, compact: false } },
    { id: "w_rem", type: "reminders", config: { filter: "open" } },
    { id: "w_stats", type: "stats", config: {} },
    { id: "w_act", type: "activities", config: {} },
    { id: "w_req", type: "requests", config: {} },
    { id: "w_sys", type: "system_bar", config: {} },
    { id: "w_qa", type: "quick_actions", config: {} },
    { id: "w_ql", type: "quick_links", config: {} },
  ],
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function isValidLayout(v: unknown): v is DashboardLayout {
  if (!v || typeof v !== "object") return false;
  const w = (v as DashboardLayout).widgets;
  if (!Array.isArray(w)) return false;
  return w.every(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.type === "string" &&
      DASHBOARD_WIDGET_CATALOG.some((c) => c.type === item.type),
  );
}

export function getDashboardLayout(): DashboardLayout {
  const stored = readJson<unknown>(LAYOUT_KEY, null);
  if (isValidLayout(stored)) return stored;
  return DEFAULT_DASHBOARD_LAYOUT;
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  writeJson(LAYOUT_KEY, layout);
}

export function resetDashboardLayout(): DashboardLayout {
  saveDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
  return DEFAULT_DASHBOARD_LAYOUT;
}

export function getWidgetMeta(type: DashboardWidgetType): DashboardWidgetMeta {
  return DASHBOARD_WIDGET_CATALOG.find((c) => c.type === type)!;
}

export function createWidget(type: DashboardWidgetType): DashboardWidgetInstance {
  const base = DEFAULT_DASHBOARD_LAYOUT.widgets.find((w) => w.type === type);
  return {
    id: newId(),
    type,
    config: base ? { ...base.config } : {},
  };
}

export function moveWidget(layout: DashboardLayout, id: string, dir: -1 | 1): DashboardLayout {
  const idx = layout.widgets.findIndex((w) => w.id === id);
  if (idx < 0) return layout;
  const next = idx + dir;
  if (next < 0 || next >= layout.widgets.length) return layout;
  const widgets = [...layout.widgets];
  const [item] = widgets.splice(idx, 1);
  widgets.splice(next, 0, item);
  return { widgets };
}

export function removeWidget(layout: DashboardLayout, id: string): DashboardLayout {
  return { widgets: layout.widgets.filter((w) => w.id !== id) };
}

export function addWidget(layout: DashboardLayout, type: DashboardWidgetType): DashboardLayout {
  if (layout.widgets.some((w) => w.type === type)) return layout;
  return { widgets: [...layout.widgets, createWidget(type)] };
}

export function updateWidgetConfig(
  layout: DashboardLayout,
  id: string,
  patch: Record<string, unknown>,
): DashboardLayout {
  return {
    widgets: layout.widgets.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w)),
  };
}

export const DASHBOARD_LAYOUT_STORAGE_KEY = LAYOUT_KEY;

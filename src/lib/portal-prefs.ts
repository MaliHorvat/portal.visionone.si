import type { WorkspaceTab } from "@/components/portal/client-workspace/types";

const FAV_KEY = "vo-portal-favorite-clients";
const RECENT_KEY = "vo-portal-recent-clients";
const SIDEBAR_KEY = "vo-portal-sidebar-collapsed";
const LAST_TAB_KEY = "vo-portal-client-last-tab";
const QUICK_HIDDEN_KEY = "vo-portal-quick-actions-hidden";
const DASH_COMPACT_KEY = "vo-portal-dashboard-compact";
const DASH_FAV_ONLY_KEY = "vo-portal-dashboard-favorites-only";
const CLIENT_NOTES_KEY = "vo-portal-client-internal-notes";

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

export function getFavoriteClientIds(): string[] {
  const arr = readJson<string[]>(FAV_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

export function toggleFavoriteClient(id: string): string[] {
  const cur = getFavoriteClientIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  writeJson(FAV_KEY, next);
  return next;
}

export function pushRecentClient(id: string, name: string): void {
  const list = readJson<{ id: string; name: string; at: number }[]>(RECENT_KEY, []);
  const filtered = list.filter((x) => x.id !== id);
  filtered.unshift({ id, name, at: Date.now() });
  writeJson(RECENT_KEY, filtered.slice(0, 12));
}

export function getRecentClients(): { id: string; name: string; at: number }[] {
  const list = readJson<{ id: string; name: string; at: number }[]>(RECENT_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getSidebarCollapsed(): boolean {
  return readJson<boolean>(SIDEBAR_KEY, false);
}

export function setSidebarCollapsed(v: boolean): void {
  writeJson(SIDEBAR_KEY, v);
}

export function getLastClientTab(clientId: string): WorkspaceTab | null {
  const map = readJson<Record<string, WorkspaceTab>>(LAST_TAB_KEY, {});
  const t = map[clientId];
  return t ?? null;
}

export function setLastClientTab(clientId: string, tab: WorkspaceTab): void {
  const map = readJson<Record<string, WorkspaceTab>>(LAST_TAB_KEY, {});
  map[clientId] = tab;
  writeJson(LAST_TAB_KEY, map);
}

export function getHiddenQuickActions(): string[] {
  return readJson<string[]>(QUICK_HIDDEN_KEY, []);
}

export function toggleQuickActionHidden(href: string): string[] {
  const cur = getHiddenQuickActions();
  const next = cur.includes(href) ? cur.filter((x) => x !== href) : [...cur, href];
  writeJson(QUICK_HIDDEN_KEY, next);
  return next;
}

export function getDashboardCompact(): boolean {
  return readJson<boolean>(DASH_COMPACT_KEY, false);
}

export function setDashboardCompact(v: boolean): void {
  writeJson(DASH_COMPACT_KEY, v);
}

export function getDashboardFavoritesOnly(): boolean {
  return readJson<boolean>(DASH_FAV_ONLY_KEY, false);
}

export function setDashboardFavoritesOnly(v: boolean): void {
  writeJson(DASH_FAV_ONLY_KEY, v);
}

export function getClientInternalNote(clientId: string): string {
  const map = readJson<Record<string, string>>(CLIENT_NOTES_KEY, {});
  return map[clientId] ?? "";
}

export function setClientInternalNote(clientId: string, note: string): void {
  const map = readJson<Record<string, string>>(CLIENT_NOTES_KEY, {});
  if (note.trim()) map[clientId] = note.trim();
  else delete map[clientId];
  writeJson(CLIENT_NOTES_KEY, map);
}

export function clearPortalLocalPrefs(): void {
  if (typeof window === "undefined") return;
  [
    FAV_KEY,
    RECENT_KEY,
    SIDEBAR_KEY,
    LAST_TAB_KEY,
    QUICK_HIDDEN_KEY,
    DASH_COMPACT_KEY,
    DASH_FAV_ONLY_KEY,
    CLIENT_NOTES_KEY,
    "vo_nav_section_orders",
    "vo-portal-dashboard-layout",
  ].forEach((k) => localStorage.removeItem(k));
}

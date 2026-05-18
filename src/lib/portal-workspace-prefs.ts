const FAV_KEY = "vo-portal-favorite-clients";
const RECENT_KEY = "vo-portal-recent-clients";

export function getFavoriteClientIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteClient(id: string): string[] {
  const cur = getFavoriteClientIds();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next;
}

export function pushRecentClient(id: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: { id: string; name: string; at: number }[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((x) => x.id !== id);
    filtered.unshift({ id, name, at: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 12)));
  } catch {
    // ignore
  }
}

export function getRecentClients(): { id: string; name: string; at: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as { id: string; name: string; at: number }[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

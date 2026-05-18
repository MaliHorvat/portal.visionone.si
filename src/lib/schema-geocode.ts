/** Poenostavljeno geokodiranje naslova (Nominatim / OSM). */
export async function geocodeAddress(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "VisionOnePortal/1.0" },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const hit = data[0];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: hit.display_name };
  } catch {
    return null;
  }
}

export const DEFAULT_MAP_CENTER = { lng: 14.9955, lat: 46.1512, zoom: 13 };

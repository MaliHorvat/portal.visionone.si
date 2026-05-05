import type { ClientSummary } from "@/lib/types";

/** Pot do profila stranke — po možnosti berljiv slug, sicer notranji id (združljivo nazaj). */
export function clientProfilePath(c: Pick<ClientSummary, "id" | "slug">): string {
  const segment = c.slug && c.slug.length > 0 ? c.slug : c.id;
  return `/portal/stranke/${encodeURIComponent(segment)}`;
}

import type { RackUnit } from "@/lib/types";

export function parseRackUnits(raw: unknown): RackUnit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
    .map((u, i) => ({
      uStart: typeof u.uStart === "number" ? u.uStart : i + 1,
      uSpan: typeof u.uSpan === "number" ? u.uSpan : 1,
      label: typeof u.label === "string" ? u.label : "Naprava",
      deviceType: typeof u.deviceType === "string" ? u.deviceType : "other",
    }));
}

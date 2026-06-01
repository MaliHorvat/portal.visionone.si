/** VisionOne Care Box — monitoring-only produkt (brez VMS za stranko). */

export type CareSlaTier = "" | "standard" | "priority" | "critical";

export const CARE_SLA_OPTIONS: { value: CareSlaTier; label: string; hint: string }[] = [
  { value: "", label: "— Ni nastavljeno —", hint: "" },
  { value: "standard", label: "Standard", hint: "Odziv naslednji delovni dan" },
  { value: "priority", label: "Priority", hint: "Odziv v 8 urah (delovni čas)" },
  { value: "critical", label: "Critical 24/7", hint: "Odziv v 4 urah, alarmi non-stop" },
];

export function careSlaLabel(tier: string): string {
  const hit = CARE_SLA_OPTIONS.find((o) => o.value === tier)?.label;
  return hit ?? (tier ? tier : "—");
}

/** Agent velja za online, če je bil viden v zadnjih N minutah. */
export function isAgentOnline(lastSeenAt: Date | string | null | undefined, windowMinutes = 6): boolean {
  if (!lastSeenAt) return false;
  const t = typeof lastSeenAt === "string" ? new Date(lastSeenAt).getTime() : lastSeenAt.getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < windowMinutes * 60 * 1000;
}

export function isCareBoxAgent(externalId: string, agentKind?: string): boolean {
  return agentKind === "care_box" || externalId.startsWith("care-");
}

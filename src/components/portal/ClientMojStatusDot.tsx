/** Indikator moj.visionone.si — prikaže se le, če je portal vklopljen za stranko. */
export function ClientMojStatusDot({
  enabled,
  health,
  title,
}: {
  enabled: boolean;
  health: "ok" | "alarm";
  title?: string;
}) {
  if (!enabled) return null;
  const ok = health === "ok";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        ok ? "bg-[var(--vo-ok)] ring-2 ring-[var(--vo-ok-muted)]" : "bg-[var(--vo-danger)] ring-2 ring-[var(--vo-danger-muted)]"
      }`}
      title={title ?? (ok ? "moj.visionone.si — vse v redu" : "moj.visionone.si — napaka / alarm")}
      aria-hidden
    />
  );
}

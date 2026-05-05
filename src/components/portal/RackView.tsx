import type { RackUnit } from "@/lib/types";

export function RackView({ units }: { units: RackUnit[] }) {
  const sorted = [...units].sort((a, b) => a.uStart - b.uStart);

  return (
    <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Rack omarica (U enote)</h3>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">Demo postavitev — podatki iz API / inventarja.</p>
      <div className="mt-4 flex gap-3">
        <div className="flex w-8 flex-col gap-1 text-right text-[10px] leading-none text-[var(--vo-muted)]">
          {sorted.map((u) => (
            <div
              key={u.label}
              className="flex items-center justify-end"
              style={{ minHeight: `${u.uSpan * 1.75}rem` }}
            >
              U{u.uStart}
              {u.uSpan > 1 ? (
                <span className="sr-only">
                  {" "}
                  do U{u.uStart + u.uSpan - 1}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex min-h-[220px] flex-1 flex-col gap-1 rounded-lg border-2 border-slate-600 bg-slate-900 p-2 dark:bg-slate-950">
          {sorted.map((u) => (
            <div
              key={u.label}
              className="flex flex-1 items-center justify-center rounded-md border border-teal-500/35 bg-gradient-to-r from-teal-950/80 to-slate-900 px-2 text-center text-xs font-medium text-teal-50"
              style={{ flex: u.uSpan }}
            >
              <div>
                <div>{u.label}</div>
                <div className="text-[10px] font-normal text-teal-200/80">
                  {u.uSpan}U · {u.deviceType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

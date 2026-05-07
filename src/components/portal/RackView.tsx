import type { RackUnit } from "@/lib/types";

export function RackView({ units }: { units: RackUnit[] }) {
  const sorted = [...units].sort((a, b) => a.uStart - b.uStart);

  return (
    <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Rack omarica (U enote)</h3>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">Vizual omare + U enote opreme.</p>
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
        <div className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-zinc-400/50 bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-200 p-3">
          <div className="pointer-events-none absolute left-2 top-2 h-4 w-14 rounded-sm bg-zinc-500/20" />
          <div className="pointer-events-none absolute right-2 top-2 h-4 w-14 rounded-sm bg-zinc-500/20" />
          <div className="absolute inset-y-8 left-4 w-1 rounded bg-zinc-700/45" />
          <div className="absolute inset-y-8 right-4 w-1 rounded bg-zinc-700/45" />
          <div className="relative flex h-full flex-col gap-1 rounded-md border border-zinc-600/40 bg-zinc-900/80 p-2">
            {sorted.map((u) => (
              <div
                key={u.label}
                className="flex flex-1 items-center justify-center rounded-md border border-cyan-300/20 bg-gradient-to-r from-zinc-800 to-zinc-900 px-2 text-center text-xs font-medium text-zinc-100"
                style={{ flex: u.uSpan }}
              >
                <div>
                  <div>{u.label}</div>
                  <div className="text-[10px] font-normal text-zinc-300">
                    {u.uSpan}U · {u.deviceType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

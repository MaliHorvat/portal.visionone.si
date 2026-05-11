"use client";

import { useEffect, useState } from "react";
import type { WorkspaceCtx } from "./types";

type TimelineEvent = {
  id: number;
  at: string;
  action: string;
  details: string;
  username: string;
};

export function TabTimeline({ ctx }: { ctx: WorkspaceCtx }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clients/${ctx.clientId}/timeline`);
      setLoading(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setError(j.error ?? "Napaka pri nalaganju.");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { events?: TimelineEvent[] };
      if (!cancelled) setEvents(data.events ?? []);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [ctx.clientId]);

  return (
    <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Audit timeline</h2>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">Kdo, kaj, kdaj na tej stranki.</p>
      {loading ? <p className="mt-4 text-sm text-[var(--vo-muted)]">Nalagam...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <ul className="mt-4 space-y-2">
          {events.length === 0 ? (
            <li className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm text-[var(--vo-muted)]">
              Ni dogodkov.
            </li>
          ) : null}
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2">
              <p className="text-sm font-medium text-[var(--vo-fg)]">{e.action}</p>
              <p className="text-xs text-[var(--vo-muted)]">
                {new Date(e.at).toLocaleString("sl-SI")} · {e.username || "portal"}
              </p>
              {e.details ? <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--vo-fg)]/90">{e.details}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}


"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type EdgeRow = {
  id: string;
  externalId: string;
  name: string;
  status: string;
  version: string;
  lastSeenAt: string | null;
  lastEventAt: string | null;
  lastError: string;
  client: { id: string; slug: string | null; name: string };
};

type EventRow = {
  id: string;
  frigateEventId: string;
  frigateCameraKey: string;
  eventType: string;
  label: string;
  score: number | null;
  zone: string;
  severity: string;
  startedAt: string;
  snapshotUrl: string;
  clipUrl: string;
  client: { id: string; slug: string | null; name: string };
  camera: { id: string; name: string; ip: string; frigateCameraKey: string } | null;
  edge: { id: string; externalId: string; name: string; status: string } | null;
};

function fmt(value: string | null | undefined) {
  if (!value) return "nikoli";
  return new Date(value).toLocaleString("sl-SI");
}

function statusClass(status: string) {
  return status === "online"
    ? "bg-emerald-500/15 text-emerald-300"
    : status === "offline"
      ? "bg-red-500/15 text-red-300"
      : "bg-slate-500/15 text-slate-300";
}

export function VmsView({ dbConfigured }: { dbConfigured: boolean }) {
  const [edges, setEdges] = useState<EdgeRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dbConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const [edgeRes, eventRes] = await Promise.all([
        fetch("/api/vms/edges", { credentials: "include", cache: "no-store" }),
        fetch("/api/vms/events?take=75", { credentials: "include", cache: "no-store" }),
      ]);
      const edgeData = (await edgeRes.json().catch(() => ({}))) as { edges?: EdgeRow[]; error?: string };
      const eventData = (await eventRes.json().catch(() => ({}))) as { events?: EventRow[]; error?: string };
      if (!edgeRes.ok) throw new Error(edgeData.error ?? "Branje VMS edge instanc ni uspelo.");
      if (!eventRes.ok) throw new Error(eventData.error ?? "Branje VMS dogodkov ni uspelo.");
      setEdges(edgeData.edges ?? []);
      setEvents(eventData.events ?? []);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Povezava ni uspela.");
    } finally {
      setLoading(false);
    }
  }, [dbConfigured]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!dbConfigured) {
    return (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6">
        <p className="text-sm text-[var(--vo-muted)]">Baza ni nastavljena (DATABASE_URL).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">VisionOne VMS</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Centralni pregled Frigate edge instanc, kamer in zadnjih dogodkov pri strankah.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-sm font-medium text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
        >
          Osveži
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Edge instance</h2>
        {loading ? (
          <p className="mt-3 text-sm text-[var(--vo-muted)]">Nalaganje…</p>
        ) : edges.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--vo-muted)]">Ni registriranih Frigate edge instanc.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {edges.map((edge) => (
              <div key={edge.id} className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--vo-fg)]">{edge.name}</p>
                    <Link
                      href={`/portal/stranke/${edge.client.slug ?? edge.client.id}`}
                      className="text-xs text-[var(--vo-accent)] hover:underline"
                    >
                      {edge.client.name}
                    </Link>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(edge.status)}`}>
                    {edge.status}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-xs text-[var(--vo-muted)]">
                  <div className="flex justify-between gap-3">
                    <dt>Agent</dt>
                    <dd className="font-mono text-[var(--vo-fg)]">{edge.externalId}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Zadnji kontakt</dt>
                    <dd>{fmt(edge.lastSeenAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Zadnji dogodek</dt>
                    <dd>{fmt(edge.lastEventAt)}</dd>
                  </div>
                  {edge.version ? (
                    <div className="flex justify-between gap-3">
                      <dt>Frigate</dt>
                      <dd>{edge.version}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zadnji VMS dogodki</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--vo-muted)]">Ni dogodkov.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="border-b border-[var(--vo-border)] text-xs text-[var(--vo-muted)]">
                <tr>
                  <th className="py-2 pr-4 font-medium">Čas</th>
                  <th className="py-2 pr-4 font-medium">Stranka</th>
                  <th className="py-2 pr-4 font-medium">Kamera</th>
                  <th className="py-2 pr-4 font-medium">Dogodek</th>
                  <th className="py-2 pr-4 font-medium">Cona</th>
                  <th className="py-2 pr-4 font-medium">Media</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-[var(--vo-border)]">
                    <td className="py-2 pr-4 text-[var(--vo-muted)]">{fmt(event.startedAt)}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/portal/stranke/${event.client.slug ?? event.client.id}`}
                        className="text-[var(--vo-accent)] hover:underline"
                      >
                        {event.client.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-[var(--vo-fg)]">
                      {event.camera?.name ?? event.frigateCameraKey}
                    </td>
                    <td className="py-2 pr-4 text-[var(--vo-fg)]">
                      {event.label || event.eventType}
                      {event.score != null ? (
                        <span className="ml-1 text-xs text-[var(--vo-muted)]">
                          {Math.round(event.score * 100)}%
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-[var(--vo-muted)]">{event.zone || "—"}</td>
                    <td className="py-2 pr-4">
                      {event.snapshotUrl ? (
                        <a className="text-[var(--vo-accent)] hover:underline" href={event.snapshotUrl} target="_blank">
                          snapshot
                        </a>
                      ) : (
                        <span className="text-[var(--vo-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}


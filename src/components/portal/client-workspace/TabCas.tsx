"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

type Log = {
  id: string;
  workDate: string;
  technician: string;
  note: string;
  startedAt?: string | null;
  endedAt?: string | null;
  hours: number;
  hourlyRate: number;
  costComputed: number;
};

function fmtH(hours: number) {
  return `${hours.toFixed(2)} h`;
}

/** Obseg npr. 10:00-12:00 ali 10.00–12.30 */
function parseTimeRangeToHours(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, "").replace(/–/g, "-");
  const m = /^(\d{1,2})[:.](\d{2})-(\d{1,2})[:.](\d{2})$/.exec(s);
  if (!m) return null;
  const h1 = Number(m[1]);
  const mi1 = Number(m[2]);
  const h2 = Number(m[3]);
  const mi2 = Number(m[4]);
  if ([h1, mi1, h2, mi2].some((x) => Number.isNaN(x))) return null;
  if (mi1 >= 60 || mi2 >= 60 || h1 > 23 || h2 > 23) return null;
  const t1 = h1 + mi1 / 60;
  const t2 = h2 + mi2 / 60;
  if (t2 <= t1) return null;
  return Math.round((t2 - t1) * 100) / 100;
}

export function TabCas({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured } = ctx;
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  const [tech, setTech] = useState("");
  const [note, setNote] = useState("");
  const [rate, setRate] = useState(20);
  const [hoursManual, setHoursManual] = useState(0);
  const [timeRange, setTimeRange] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}/timelogs`);
    if (!r.ok) return;
    const j = await r.json();
    setLogs(j.logs ?? []);
  }, [clientId, dbConfigured]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const runningByTech = useMemo(() => {
    const map = new Map<string, Log>();
    for (const l of logs) {
      if (l.startedAt && !l.endedAt) map.set(l.technician, l);
    }
    return map;
  }, [logs]);

  const running = tech.trim() ? runningByTech.get(tech.trim()) ?? null : null;

  function liveHours(l: Log) {
    if (!l.startedAt || l.endedAt) return l.hours;
    const start = new Date(l.startedAt).getTime();
    const now = Date.now();
    const hours = Math.max(0, (now - start) / 36e5);
    return Math.round(hours * 100) / 100;
  }

  async function addManual() {
    if (!tech.trim() || !dbConfigured) return;
    let hours = hoursManual;
    const tr = timeRange.trim();
    if (tr) {
      const parsed = parseTimeRangeToHours(tr);
      if (parsed === null) {
        showToast("Neveljaven obseg. Zapis: npr. 10:00-12:00 ali 10.00-12.30.", "err");
        return;
      }
      hours = parsed;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      showToast("Vnesi pozitivne ure ali veljaven obseg.", "err");
      return;
    }
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/timelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        technician: tech.trim(),
        hourlyRate: rate,
        hours,
        workDate: date,
        note,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Vnos ur ni uspel.", "err");
      return;
    }
    setHoursManual(0);
    setTimeRange("");
    setNote("");
    await load();
    showToast("Ure dodane.");
  }

  async function start() {
    if (!tech.trim() || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/timelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "start",
        technician: tech.trim(),
        hourlyRate: rate,
        workDate: date,
        note,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      showToast(j?.error ?? "Začetek dela ni uspel.", "err");
      return;
    }
    await load();
    showToast("Delo zagnano.");
  }

  async function stop(id: string) {
    if (!dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/timelogs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      showToast(j?.error ?? "Ustavitev dela ni uspela.", "err");
      return;
    }
    await load();
    showToast("Delo ustavljeno.");
  }

  async function del(id: string) {
    if (!confirm("Izbris?")) return;
    const r = await fetch(`/api/clients/${clientId}/timelogs/${id}`, { method: "DELETE" });
    if (!r.ok) {
      showToast("Brisanje vnosa ni uspelo.", "err");
      return;
    }
    await load();
    showToast("Vnos izbrisan.");
  }

  const sumH = logs.reduce((s, l) => s + liveHours(l), 0);
  const sumC = logs.reduce(
    (s, l) => s + (l.startedAt && !l.endedAt ? liveHours(l) * l.hourlyRate : l.costComputed),
    0,
  );

  return (
    <div className="space-y-6">
      {!dbConfigured ? <p className="text-sm text-amber-200">Zahtevana je baza.</p> : null}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
        <label className="flex min-w-[180px] flex-1 flex-col text-xs text-[var(--vo-muted)]">
          Tehnik
          <input
            placeholder="Ime tehnika"
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            className="mt-1 rounded border border-[var(--vo-border)] px-2 py-2 text-sm text-[var(--vo-fg)]"
          />
        </label>
        <label className="flex min-w-[220px] flex-[2] flex-col text-xs text-[var(--vo-muted)]">
          Opis
          <input
            placeholder="Kaj se je delalo…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 rounded border border-[var(--vo-border)] px-2 py-2 text-sm text-[var(--vo-fg)]"
          />
        </label>
        <label className="flex flex-col text-xs text-[var(--vo-muted)]">
          Urna postavka
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="mt-1 block w-24 rounded border border-[var(--vo-border)] px-2 py-1.5 text-[var(--vo-fg)]"
          />
        </label>
        <label className="flex flex-col text-xs text-[var(--vo-muted)]">
          Datum
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded border border-[var(--vo-border)] px-2 py-1.5 text-[var(--vo-fg)]"
          />
        </label>
        <div className="flex items-center gap-2">
          {running ? (
            <button
              type="button"
              disabled={busy || !dbConfigured}
              onClick={() => void stop(running.id)}
              className="rounded-lg bg-[var(--vo-danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Ustavi delo
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !dbConfigured}
              onClick={() => void start()}
              className="rounded-lg bg-[var(--vo-fg)] px-4 py-2 text-sm font-semibold text-[var(--vo-bg)] disabled:opacity-40"
            >
              Začni delo
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-l border-[var(--vo-border)] pl-3">
          <label className="flex flex-col text-xs text-[var(--vo-muted)]">
            Obseg ur
            <input
              placeholder="10:00-12:00"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="mt-1 w-36 rounded border border-[var(--vo-border)] px-2 py-1.5 font-mono text-sm text-[var(--vo-fg)]"
            />
          </label>
          <label className="flex flex-col text-xs text-[var(--vo-muted)]">
            Ali ure (decimalno)
            <input
              type="number"
              step="0.25"
              value={hoursManual}
              onChange={(e) => setHoursManual(Number(e.target.value) || 0)}
              className="mt-1 w-20 rounded border border-[var(--vo-border)] px-2 py-1.5 text-sm text-[var(--vo-fg)]"
            />
          </label>
          <button
            type="button"
            disabled={busy || !dbConfigured}
            onClick={() => void addManual()}
            className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            + Dodaj ure
          </button>
        </div>
      </div>

      {running ? (
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-sm">
          <span className="text-[var(--vo-muted)]">Aktivno:</span>{" "}
          <span className="font-medium text-[var(--vo-fg)]">
            {running.technician} · {running.note || "—"} · {fmtH(liveHours(running))}
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Tehnik</th>
              <th className="px-3 py-2">Opis</th>
              <th className="px-3 py-2">Ure</th>
              <th className="px-3 py-2">Strošek</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const isRunning = Boolean(l.startedAt && !l.endedAt);
              const h = liveHours(l);
              const cost = isRunning ? h * l.hourlyRate : l.costComputed;
              return (
                <tr key={l.id} className={`border-b border-[var(--vo-border)] ${isRunning ? "bg-emerald-950/15" : ""}`}>
                  <td className="px-3 py-2">{l.workDate}</td>
                  <td className="px-3 py-2">{l.technician}</td>
                  <td className="px-3 py-2 text-[var(--vo-muted)]">{l.note || "—"}</td>
                  <td className="px-3 py-2 text-amber-300">{fmtH(h)}</td>
                  <td className="px-3 py-2">{cost.toFixed(2)} €</td>
                  <td className="px-3 py-2 text-right">
                    {isRunning ? (
                      <button type="button" className="mr-3 text-[var(--vo-danger)] hover:underline" disabled={busy || !dbConfigured} onClick={() => void stop(l.id)}>
                        Ustavi
                      </button>
                    ) : null}
                    <button type="button" className="text-red-500 hover:underline" onClick={() => void del(l.id)}>
                      Izbriši
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--vo-surface-2)] font-semibold">
              <td className="px-3 py-2" colSpan={3}>
                Skupaj
              </td>
              <td className="px-3 py-2 text-amber-300">{fmtH(sumH)}</td>
              <td className="px-3 py-2">{sumC.toFixed(2)} €</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

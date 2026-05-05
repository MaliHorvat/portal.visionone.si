"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

type Log = {
  id: string;
  workDate: string;
  technician: string;
  hours: number;
  hourlyRate: number;
  costComputed: number;
};

export function TabCas({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured } = ctx;
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  const [tech, setTech] = useState("");
  const [rate, setRate] = useState(20);
  const [hoursManual, setHoursManual] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

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

  async function addManual() {
    if (!tech.trim() || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/timelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        technician: tech,
        hourlyRate: rate,
        hours: hoursManual,
        workDate: date,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Vnos ur ni uspel.", "err");
      return;
    }
    setHoursManual(0);
    await load();
    showToast("Ure dodane.");
  }

  async function checkInStub() {
    if (!tech.trim() || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/timelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        technician: tech,
        hourlyRate: rate,
        hours: 0.01,
        workDate: date,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Začetek dela ni uspel.", "err");
      return;
    }
    await load();
    showToast("Začetek dela zabeležen.");
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

  const sumH = logs.reduce((s, l) => s + l.hours, 0);
  const sumC = logs.reduce((s, l) => s + l.costComputed, 0);

  return (
    <div className="space-y-6">
      {!dbConfigured ? <p className="text-sm text-amber-200">Zahtevana je baza.</p> : null}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
        <input placeholder="Ime tehnika" value={tech} onChange={(e) => setTech(e.target.value)} className="min-w-[160px] flex-1 rounded border border-[var(--vo-border)] px-2 py-2 text-sm" />
        <label className="text-xs text-[var(--vo-muted)]">
          Urna postavka
          <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} className="mt-1 block w-24 rounded border border-[var(--vo-border)] px-2 py-1.5" />
        </label>
        <label className="text-xs text-[var(--vo-muted)]">
          Datum
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block rounded border border-[var(--vo-border)] px-2 py-1.5" />
        </label>
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void checkInStub()}
          className="rounded-lg bg-[var(--vo-fg)] px-4 py-2 text-sm font-semibold text-[var(--vo-bg)] disabled:opacity-40"
        >
          Začni delo (demo check-in)
        </button>
        <div className="flex items-center gap-2 border-l border-[var(--vo-border)] pl-3">
          <input type="number" step="0.25" value={hoursManual} onChange={(e) => setHoursManual(Number(e.target.value) || 0)} className="w-20 rounded border px-2 py-1.5 text-sm" />
          <button type="button" disabled={busy || !dbConfigured} onClick={() => void addManual()} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs disabled:opacity-40">
            + Dodaj ure
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2">Tehnik</th>
              <th className="px-3 py-2">Ure</th>
              <th className="px-3 py-2">Strošek</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[var(--vo-border)]">
                <td className="px-3 py-2">{l.workDate}</td>
                <td className="px-3 py-2">{l.technician}</td>
                <td className="px-3 py-2 text-amber-300">{l.hours} h</td>
                <td className="px-3 py-2">{l.costComputed.toFixed(2)} €</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" className="text-red-500 hover:underline" onClick={() => void del(l.id)}>Izbriši</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--vo-surface-2)] font-semibold">
              <td className="px-3 py-2" colSpan={2}>Skupaj</td>
              <td className="px-3 py-2 text-amber-300">{sumH.toFixed(2)} h</td>
              <td className="px-3 py-2">{sumC.toFixed(2)} €</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-[var(--vo-muted)]">Časovnik v živo — v izdelavi; trenutno ročni vnosi in demo »check-in« z minimalno uro.</p>
    </div>
  );
}

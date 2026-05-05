"use client";

import { useCallback, useEffect, useState } from "react";
import type { MaintenanceReminder } from "@/lib/types";
import type { WorkspaceCtx } from "./types";

export function TabVzdrzevanje({ ctx }: { ctx: WorkspaceCtx }) {
  const { clientId, dbConfigured } = ctx;
  const [rows, setRows] = useState<MaintenanceReminder[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/reminders?clientId=${encodeURIComponent(clientId)}`);
    if (!r.ok) return;
    const j = await r.json();
    setRows(j.reminders ?? []);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !due || !dbConfigured) return;
    setBusy(true);
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, title, dueDate: due, kind: "drugo" }),
    });
    setBusy(false);
    setTitle("");
    setDue("");
    await load();
  }

  async function toggleDone(r: MaintenanceReminder) {
    if (!dbConfigured) return;
    await fetch(`/api/reminders/${r.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: !r.completed }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!dbConfigured) return;
    if (!confirm("Izbris?")) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Vzdrževanje</h3>
      <form onSubmit={add} className="flex flex-wrap gap-2 text-sm">
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded border border-[var(--vo-border)] px-2 py-2" />
        <input placeholder="Opis naloga" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-[200px] flex-1 rounded border border-[var(--vo-border)] px-2 py-2" />
        <button type="submit" disabled={busy || !dbConfigured} className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
          + Dodaj
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm">
            <label className={`flex items-center gap-2 ${dbConfigured ? "cursor-pointer" : "opacity-60"}`}>
              <input
                type="checkbox"
                disabled={!dbConfigured}
                checked={r.completed}
                onChange={() => void toggleDone(r)}
              />
              <span className={r.completed ? "text-[var(--vo-muted)] line-through" : ""}>{r.title}</span>
            </label>
            <span className="text-xs text-[var(--vo-muted)]">{r.dueDate}</span>
            <button
              type="button"
              disabled={!dbConfigured}
              className="text-xs text-red-500 hover:underline disabled:opacity-40"
              onClick={() => void remove(r.id)}
            >
              Izbriši
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-[var(--vo-muted)]">Ni zapisov vzdrževanja za ta objekt.</p> : null}
    </div>
  );
}

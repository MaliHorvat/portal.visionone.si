"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { MaintenanceReminder } from "@/lib/types";
import type { WorkspaceCtx } from "./types";

export function TabVzdrzevanje({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured } = ctx;
  const [rows, setRows] = useState<MaintenanceReminder[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");

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
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, title, dueDate: due, kind: "drugo" }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast("Dodajanje opomnika ni uspelo.", "err");
      return;
    }
    const created = (await res.json().catch(() => ({}))) as { reminder?: MaintenanceReminder };
    setTitle("");
    setDue("");
    if (created.reminder) {
      setRows((prev) => [created.reminder!, ...prev]);
    } else {
      await load();
    }
    showToast("Opomnik dodan.");
  }

  async function toggleDone(r: MaintenanceReminder) {
    if (!dbConfigured) return;
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: !r.completed }),
    });
    if (!res.ok) {
      showToast("Posodobitev opomnika ni uspela.", "err");
      return;
    }
    setRows((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, completed: !r.completed } : x)),
    );
    showToast("Opomnik posodobljen.");
  }

  async function remove(id: string) {
    if (!dbConfigured) return;
    if (!confirm("Izbris?")) return;
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Brisanje opomnika ni uspelo.", "err");
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== id));
    showToast("Opomnik izbrisan.");
  }

  async function saveEdit(id: string) {
    if (!dbConfigured) return;
    if (!editTitle.trim() || !editDue) {
      showToast("Vnesite naslov in datum.", "err");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: editTitle, dueDate: editDue }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast("Shranjevanje ni uspelo.", "err");
      return;
    }
    setRows((prev) =>
      prev.map((x) => (x.id === id ? { ...x, title: editTitle, dueDate: editDue } : x)),
    );
    setEditId(null);
    showToast("Vzdrževanje posodobljeno.");
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Vzdrževanje</h3>
      <form onSubmit={add} className="grid grid-cols-[150px_1fr_auto] gap-2 text-sm">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-2"
        />
        <input
          placeholder="Opis naloga"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-2"
        />
        <button type="submit" disabled={busy || !dbConfigured} className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
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
              {editId === r.id ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="vo-select px-2 py-1 text-xs"
                />
              ) : (
                <span className={r.completed ? "text-[var(--vo-muted)] line-through" : ""}>{r.title}</span>
              )}
            </label>
            {editId === r.id ? (
              <input
                type="date"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                className="vo-select px-2 py-1 text-xs text-xs"
              />
            ) : (
              <span className="text-xs text-[var(--vo-muted)]">{r.dueDate}</span>
            )}
            <div className="flex items-center gap-3">
              {editId === r.id ? (
                <>
                  <button
                    type="button"
                    disabled={!dbConfigured || busy}
                    className="text-xs text-[var(--vo-accent)] hover:underline disabled:opacity-40"
                    onClick={() => void saveEdit(r.id)}
                  >
                    Shrani
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--vo-muted)] hover:underline"
                    onClick={() => setEditId(null)}
                  >
                    Prekliči
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!dbConfigured}
                  className="text-xs text-[var(--vo-accent)] hover:underline disabled:opacity-40"
                  onClick={() => {
                    setEditId(r.id);
                    setEditTitle(r.title);
                    setEditDue(r.dueDate);
                  }}
                >
                  Uredi
                </button>
              )}
              <button
                type="button"
                disabled={!dbConfigured}
                className="text-xs text-red-500 hover:underline disabled:opacity-40"
                onClick={() => void remove(r.id)}
              >
                Izbriši
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-[var(--vo-muted)]">Ni zapisov vzdrževanja za ta objekt.</p> : null}
    </div>
  );
}

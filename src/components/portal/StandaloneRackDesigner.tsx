"use client";

import { useCallback, useEffect, useState } from "react";
import type { RackUnit } from "@/lib/types";
import { RackView } from "@/components/portal/RackView";
import { usePortalToast } from "@/context/PortalToastContext";
import { parseRackUnits } from "@/components/portal/client-workspace/rack-parse";

type RackRow = { id: string; name: string; updatedAt: string };

function emptyForm(): RackUnit {
  return { uStart: 1, uSpan: 1, label: "", deviceType: "other" };
}

export function StandaloneRackDesigner({ dbConfigured }: { dbConfigured: boolean }) {
  const { showToast } = usePortalToast();
  const [list, setList] = useState<RackRow[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [units, setUnits] = useState<RackUnit[]>([]);
  const [f, setF] = useState<RackUnit>(emptyForm);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch("/api/standalone-racks");
    if (!r.ok) {
      showToast("Branje projektov ni uspelo.", "err");
      return;
    }
    const j = await r.json();
    const racks = (j.racks ?? []) as RackRow[];
    setList(racks);
    setSel((prev) => prev ?? racks[0]?.id ?? null);
  }, [dbConfigured, showToast]);

  const loadRack = useCallback(
    async (id: string) => {
      const r = await fetch(`/api/standalone-racks/${id}`);
      if (!r.ok) return;
      const j = await r.json();
      const rack = j.rack as { name: string; rackData: unknown };
      setName(rack.name ?? "Rack");
      setUnits(parseRackUnits(rack.rackData));
    },
    [],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (sel) void loadRack(sel);
    else {
      setName("");
      setUnits([]);
    }
  }, [sel, loadRack]);

  async function createProject() {
    if (!dbConfigured) return;
    setBusy(true);
    const r = await fetch("/api/standalone-racks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `Rack ${list.length + 1}`, rackData: [] }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Ustvarjanje projekta ni uspelo.", "err");
      return;
    }
    const j = await r.json();
    await loadList();
    setSel(j.rack.id);
    showToast("Nov rack projekt ustvarjen.");
  }

  async function saveProject() {
    if (!sel || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/standalone-racks/${sel}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, rackData: units }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Shranjevanje ni uspelo.", "err");
      return;
    }
    showToast("Rack projekt shranjen.");
    await loadList();
  }

  async function deleteProject() {
    if (!sel || !confirm("Izbris projekta?")) return;
    setBusy(true);
    const r = await fetch(`/api/standalone-racks/${sel}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) {
      showToast("Brisanje ni uspelo.", "err");
      return;
    }
    setSel(null);
    await loadList();
    showToast("Projekt izbrisan.");
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.label.trim()) return;
    setUnits((u) => [...u, { ...f }]);
    setF(emptyForm());
  }

  function remove(i: number) {
    setUnits((u) => u.filter((_, j) => j !== i));
  }

  function move(i: number, delta: -1 | 1) {
    setUnits((prev) => {
      const n = [...prev];
      const j = i + delta;
      if (j < 0 || j >= n.length) return prev;
      const x = n[i];
      n[i] = n[j];
      n[j] = x;
      return n;
    });
  }

  if (!dbConfigured) {
    return (
      <p className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm">
        Globalni rack dizajner zahteva bazo podatkov.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Rack dizajner</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Samostojni projekti rack omaric — niso vezani na objekt stranke.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sel ?? ""}
          onChange={(e) => setSel(e.target.value || null)}
          className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-sm"
        >
          <option value="">— izberi projekt —</option>
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createProject()}
          className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          Nov projekt
        </button>
        <button
          type="button"
          disabled={busy || !sel}
          onClick={() => void saveProject()}
          className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Shrani
        </button>
        <button
          type="button"
          disabled={!sel}
          onClick={() => void deleteProject()}
          className="text-xs text-red-500 hover:underline disabled:opacity-40"
        >
          Izbriši
        </button>
      </div>

      {sel ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
            <label className="block text-xs">
              <span className="text-[var(--vo-muted)]">Ime projekta</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--vo-border)] bg-transparent px-2 py-2"
              />
            </label>
            <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Urejanje enot</h3>
            <form onSubmit={add} className="flex flex-wrap gap-2 text-xs">
              <input
                type="number"
                min={1}
                placeholder="U začetek"
                value={f.uStart || ""}
                onChange={(e) => setF({ ...f, uStart: Number(e.target.value) || 1 })}
                className="w-20 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1"
              />
              <input
                type="number"
                min={1}
                placeholder="U višina"
                value={f.uSpan || ""}
                onChange={(e) => setF({ ...f, uSpan: Number(e.target.value) || 1 })}
                className="w-20 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1"
              />
              <input
                placeholder="Oznaka"
                value={f.label}
                onChange={(e) => setF({ ...f, label: e.target.value })}
                className="min-w-[140px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1"
              />
              <input
                placeholder="Tip"
                value={f.deviceType}
                onChange={(e) => setF({ ...f, deviceType: e.target.value })}
                className="w-28 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1"
              />
              <button type="submit" className="rounded-lg bg-[var(--vo-fg)] px-3 py-1 font-semibold text-[var(--vo-bg)]">
                +
              </button>
            </form>
            <ul className="max-h-52 space-y-1 overflow-auto text-xs">
              {units.map((u, i) => (
                <li
                  key={`${u.label}-${i}`}
                  className="flex items-center justify-between gap-2 rounded border border-[var(--vo-border)] px-2 py-1"
                >
                  <span>
                    U{u.uStart}+{u.uSpan} · {u.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <button type="button" className="text-[var(--vo-muted)] hover:underline" onClick={() => move(i, -1)}>
                      ↑
                    </button>
                    <button type="button" className="text-[var(--vo-muted)] hover:underline" onClick={() => move(i, 1)}>
                      ↓
                    </button>
                    <button type="button" className="text-red-500 hover:underline" onClick={() => remove(i)}>
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <RackView
            units={
              units.length ? units : [{ uStart: 1, uSpan: 4, label: "Prazna omarica", deviceType: "panel" }]
            }
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--vo-muted)]">Ustvarite projekt ali izberite obstoječega.</p>
      )}
    </div>
  );
}

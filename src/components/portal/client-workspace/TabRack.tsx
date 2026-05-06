"use client";

import { useEffect, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { RackUnit } from "@/lib/types";
import { RackView } from "@/components/portal/RackView";
import type { WorkspaceCtx } from "./types";
import { parseRackUnits } from "./rack-parse";

export function TabRack({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured, reload, applyClient } = ctx;
  const [units, setUnits] = useState<RackUnit[]>(() => parseRackUnits(client.rackData));
  const [f, setF] = useState<RackUnit>({ uStart: 1, uSpan: 1, label: "", deviceType: "other" });

  useEffect(() => {
    setUnits(parseRackUnits(client.rackData));
  }, [client.rackData]);

  async function save() {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rackData: units }),
    });
    if (!r.ok) {
      showToast("Shranjevanje racka ni uspelo.", "err");
      return;
    }
    const j = (await r.json().catch(() => ({}))) as { client?: typeof client };
    if (j.client) applyClient(j.client);
    else await reload();
    showToast("Rack shranjen.");
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.label.trim()) return;
    setUnits((u) => [...u, { ...f }]);
    setF({ uStart: 1, uSpan: 1, label: "", deviceType: "other" });
  }

  function remove(i: number) {
    setUnits((u) => u.filter((_, j) => j !== i));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
        <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Urejanje enot</h3>
        <form onSubmit={add} className="flex flex-wrap gap-2 text-xs">
          <input type="number" min={1} placeholder="U začetek" value={f.uStart || ""} onChange={(e) => setF({ ...f, uStart: Number(e.target.value) || 1 })} className="w-20 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1" />
          <input type="number" min={1} placeholder="U višina" value={f.uSpan || ""} onChange={(e) => setF({ ...f, uSpan: Number(e.target.value) || 1 })} className="w-20 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1" />
          <input placeholder="Oznaka" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className="min-w-[140px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1" />
          <input placeholder="Tip (switch/nvr/…)" value={f.deviceType} onChange={(e) => setF({ ...f, deviceType: e.target.value })} className="w-28 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1" />
          <button type="submit" className="rounded-lg bg-[var(--vo-fg)] px-3 py-1 font-semibold text-[var(--vo-bg)]">+</button>
        </form>
        <ul className="max-h-52 space-y-1 overflow-auto text-xs">
          {units.map((u, i) => (
            <li key={`${u.label}-${i}`} className="flex items-center justify-between gap-2 rounded border border-[var(--vo-border)] px-2 py-1">
              <span>U{u.uStart}+{u.uSpan} · {u.label}</span>
              <button type="button" className="text-red-500 hover:underline" onClick={() => remove(i)}>✕</button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!dbConfigured}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Shrani rack v stranko
        </button>
      </div>
      <RackView units={units.length ? units : [{ uStart: 1, uSpan: 4, label: "Prazna omarica", deviceType: "panel" }]} />
    </div>
  );
}

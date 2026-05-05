"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";

type DefRow = { manufacturer: string; mainStream: string; subStream: string };

export default function KameraDefinicijePage() {
  const [rows, setRows] = useState<DefRow[]>([]);
  const [manufacturer, setManufacturer] = useState("");
  const [mainStream, setMainStream] = useState("");
  const [subStream, setSubStream] = useState("");

  async function load() {
    const res = await fetch("/api/camera-definitions", { credentials: "include" });
    const data = (await res.json()) as { definitions?: DefRow[] };
    setRows(data.definitions ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/camera-definitions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manufacturer, mainStream, subStream }),
    });
    setManufacturer("");
    setMainStream("");
    setSubStream("");
    await load();
  }

  async function del(m: string) {
    if (!confirm(`Izbrisati ${m}?`)) return;
    await fetch(
      `/api/camera-definitions?manufacturer=${encodeURIComponent(m)}`,
      { method: "DELETE", credentials: "include" },
    );
    await load();
  }

  return (
    <AdminGate>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">RTSP definicije (proizvajalci)</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Predloge poti za glavni/podtok — kot <code className="text-xs">camera_definitions</code> v desktop app.
          </p>
        </div>

        <form
          onSubmit={save}
          className="grid gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 md:grid-cols-4"
        >
          <input
            required
            placeholder="Proizvajalec (npr. Dahua)"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm md:col-span-1"
          />
          <input
            placeholder="Main stream pot"
            value={mainStream}
            onChange={(e) => setMainStream(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm md:col-span-1"
          />
          <input
            placeholder="Sub stream pot"
            value={subStream}
            onChange={(e) => setSubStream(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm md:col-span-1"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--vo-accent)] py-2 text-sm font-semibold text-white md:col-span-1"
          >
            Shrani
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-4 py-2">Proizvajalec</th>
                <th className="px-4 py-2">Main</th>
                <th className="px-4 py-2">Sub</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.manufacturer} className="border-t border-[var(--vo-border)]">
                  <td className="px-4 py-2 font-medium">{r.manufacturer}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.mainStream}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.subStream}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" className="text-[var(--vo-danger)] text-xs" onClick={() => void del(r.manufacturer)}>
                      Briši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}

"use client";

import { useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";
import { mockTimeLogs, getMockClients } from "@/lib/mock-data";
import type { TimeLogEntry } from "@/lib/types";

export default function CasPage() {
  const [logs, setLogs] = useState<TimeLogEntry[]>(mockTimeLogs);
  const clients = getMockClients();

  function addLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const projectId = String(fd.get("project") || clients[0]?.id);
    const project = clients.find((c) => c.id === projectId);
    const hours = Number(fd.get("hours") || 0);
    const note = String(fd.get("note") || "");
    const date = String(fd.get("date") || new Date().toISOString().slice(0, 10));
    setLogs((prev) => [
      {
        id: `t${Date.now()}`,
        projectId,
        projectName: project?.name ?? "Projekt",
        date,
        hours,
        note,
      },
      ...prev,
    ]);
    e.currentTarget.reset();
  }

  return (
    <AdminGate>
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Beleženje časa</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Ure na terenu po projektih — zapis naj kasneje shrani Go API.
        </p>
      </div>

      <form
        onSubmit={addLog}
        className="grid gap-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)] sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--vo-muted)]">Projekt</span>
          <select
            name="project"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
            defaultValue={clients[0]?.id}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--vo-muted)]">Datum</span>
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--vo-muted)]">Ure</span>
          <input
            type="number"
            name="hours"
            step="0.25"
            min="0"
            required
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
          />
        </label>
        <label className="text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-[var(--vo-muted)]">Opomba</span>
          <input
            name="note"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-4"
        >
          Dodaj zapis (lokalno)
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Projekt</th>
              <th className="px-4 py-3 font-medium">Ure</th>
              <th className="px-4 py-3 font-medium">Opomba</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[var(--vo-border)] last:border-0">
                <td className="px-4 py-3 text-[var(--vo-muted)]">{l.date}</td>
                <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{l.projectName}</td>
                <td className="px-4 py-3">{l.hours}</td>
                <td className="px-4 py-3 text-[var(--vo-muted)]">{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </AdminGate>
  );
}

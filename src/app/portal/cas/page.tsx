"use client";

import { useMemo, useState } from "react";

import { Download, Search } from "lucide-react";

import { AdminGate } from "@/components/portal/AdminGate";

import {
  decimalFromFormData,
  decimalTextInputProps,
} from "@/lib/decimal-number-input";

import { exportTimeLogsCsv } from "@/lib/portal-export";

import { mockTimeLogs, getMockClients } from "@/lib/mock-data";

import type { TimeLogEntry } from "@/lib/types";

export default function CasPage() {
  const [logs, setLogs] = useState<TimeLogEntry[]>(mockTimeLogs);

  const [search, setSearch] = useState("");

  const [projectFilter, setProjectFilter] = useState("");

  const clients = getMockClients();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((l) => {
      if (projectFilter && l.projectId !== projectFilter) return false;

      if (!q) return true;

      return (
        l.projectName.toLowerCase().includes(q) ||
        l.note.toLowerCase().includes(q) ||
        l.date.includes(q)
      );
    });
  }, [logs, search, projectFilter]);

  const totalHours = useMemo(
    () => filtered.reduce((sum, l) => sum + l.hours, 0),

    [filtered],
  );

  function addLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const projectId = String(fd.get("project") || clients[0]?.id);

    const project = clients.find((c) => c.id === projectId);

    const hours = decimalFromFormData(fd, "hours", 0);

    const note = String(fd.get("note") || "");

    const date = String(
      fd.get("date") || new Date().toISOString().slice(0, 10),
    );

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

  function removeLog(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <AdminGate>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">
            Beleženje časa
          </h1>

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
              name="hours"
              {...decimalTextInputProps}
              required
              placeholder="npr. 2,5"
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" />

            <input
              type="search"
              placeholder="Išči po projektu, opombi, datumu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            aria-label="Projekt"
          >
            <option value="">Vsi projekti</option>

            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => exportTimeLogsCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>

          <span className="text-sm font-medium text-[var(--vo-fg)]">
            Skupaj: {totalHours.toFixed(1)} h
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Datum</th>

                <th className="px-4 py-3 font-medium">Projekt</th>

                <th className="px-4 py-3 font-medium">Ure</th>

                <th className="px-4 py-3 font-medium">Opomba</th>

                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>

            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-[var(--vo-border)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--vo-muted)]">{l.date}</td>

                  <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">
                    {l.projectName}
                  </td>

                  <td className="px-4 py-3">{l.hours}</td>

                  <td className="px-4 py-3 text-[var(--vo-muted)]">{l.note}</td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeLog(l.id)}
                      className="text-xs text-[var(--vo-danger)] hover:underline"
                    >
                      Briši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--vo-muted)]">
              Ni zapisov.
            </p>
          ) : null}
        </div>
      </div>
    </AdminGate>
  );
}

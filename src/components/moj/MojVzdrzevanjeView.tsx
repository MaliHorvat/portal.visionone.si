"use client";

import { useEffect, useState } from "react";
import type { MaintenanceReminder } from "@/lib/types";

const KIND: Record<string, string> = {
  ciscenje_kamer: "Čiščenje kamer",
  diski: "Diski / kapaciteta",
  servis: "Servis",
  drugo: "Drugo",
};

export function MojVzdrzevanjeView() {
  const [rows, setRows] = useState<MaintenanceReminder[]>([]);

  useEffect(() => {
    void fetch("/api/reminders", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { reminders?: MaintenanceReminder[] }) => {
        const list = j.reminders ?? [];
        setRows(
          [...list]
            .filter((r) => !r.completed)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        );
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Vzdrževanje</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Načrtovani obiski, čiščenje kamer in redni servisi — brez presenečenj.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--vo-border)] px-4 py-8 text-center text-sm text-[var(--vo-muted)]">
            Trenutno ni razpisanih terminov. Ob novih dogovorih vas obvestimo.
          </li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-4">
              <div>
                <p className="font-semibold text-[var(--vo-fg)]">{r.title}</p>
                <p className="text-xs text-[var(--vo-muted)]">{KIND[r.kind] ?? r.kind}</p>
              </div>
              <p className="text-sm font-bold text-[var(--vo-accent)]">{r.dueDate}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

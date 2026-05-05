"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";

type LogRow = {
  id: number;
  createdAt: string;
  username: string;
  action: string;
  details: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/audit-logs?limit=200", { credentials: "include" });
      const data = (await res.json()) as { logs?: LogRow[] };
      setLogs(data.logs ?? []);
    })();
  }, []);

  return (
    <AdminGate>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Audit log</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">Zadnji dogodki v portalu (admin).</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-[var(--vo-border)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2">Čas</th>
                <th className="px-3 py-2">Uporabnik</th>
                <th className="px-3 py-2">Akcija</th>
                <th className="px-3 py-2">Podrobnosti</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-[var(--vo-border)]">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("sl-SI")}</td>
                  <td className="px-3 py-2">{l.username}</td>
                  <td className="px-3 py-2 font-mono">{l.action}</td>
                  <td className="px-3 py-2 max-w-md truncate">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}

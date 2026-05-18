"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { AdminGate } from "@/components/portal/AdminGate";
import { exportAuditCsv } from "@/lib/portal-export";

type LogRow = {
  id: number;
  createdAt: string;
  username: string;
  action: string;
  details: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(200);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?limit=${limit}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { logs?: LogRow[] };
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const users = useMemo(
    () =>
      [...new Set(logs.map((l) => l.username).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "sl"),
      ),
    [logs],
  );

  const actions = useMemo(
    () =>
      [...new Set(logs.map((l) => l.action).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "sl"),
      ),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (userFilter && l.username !== userFilter) return false;
      if (actionFilter && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        l.username.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    });
  }, [logs, search, userFilter, actionFilter]);

  return (
    <AdminGate>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Audit log</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Zadnji dogodki v portalu (admin).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" />
            <input
              type="search"
              placeholder="Išči po uporabniku, akciji, podrobnostih…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            aria-label="Uporabnik"
          >
            <option value="">Vsi uporabniki</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="max-w-[180px] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            aria-label="Akcija"
          >
            <option value="">Vse akcije</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            aria-label="Število zapisov"
          >
            {[100, 200, 500].map((n) => (
              <option key={n} value={n}>
                {n} zapisov
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Osveži
          </button>
          <button
            type="button"
            onClick={() =>
              exportAuditCsv(
                filtered.map((l) => ({
                  createdAt: new Date(l.createdAt).toLocaleString("sl-SI"),
                  username: l.username,
                  action: l.action,
                  details: l.details,
                })),
              )
            }
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <span className="text-xs text-[var(--vo-muted)]">
            {filtered.length} / {logs.length}
          </span>
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
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-[var(--vo-border)] cursor-pointer hover:bg-[var(--vo-surface-2)]"
                  onClick={() =>
                    setExpandedId((id) => (id === l.id ? null : l.id))
                  }
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("sl-SI")}
                  </td>
                  <td className="px-3 py-2">{l.username}</td>
                  <td className="px-3 py-2 font-mono">{l.action}</td>
                  <td
                    className={`px-3 py-2 ${expandedId === l.id ? "max-w-none whitespace-pre-wrap" : "max-w-md truncate"}`}
                  >
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--vo-muted)]">
              Ni zapisov za izbrane filtre.
            </p>
          ) : null}
        </div>
      </div>
    </AdminGate>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RadioTower, RefreshCw } from "lucide-react";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { clientProfilePath } from "@/lib/client-url";
import type { CareBoxOverviewRowDto } from "@/lib/repositories/care-box";

type Payload = {
  rows: CareBoxOverviewRowDto[];
  counts: { total: number; offline: number; deviceIssues: number };
};

export function CareBoxOverviewView() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/care-box", { credentials: "include" });
      const j = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Napaka pri nalaganju.");
        return;
      }
      setData(j);
    } catch {
      setError("Povezava ni uspela.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const counts = data?.counts ?? { total: 0, offline: 0, deviceIssues: 0 };
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-8 pb-10">
      <PortalPageHeader
        kicker="VisionOne Care Box"
        title="Monitoring & 24/7 podpora"
        description="Pregled vseh strank z Care Box-om. Stranka ne upravlja naprave — vi spremljate status in oddaljeno podporo."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Osveži
          </button>
        }
      />
      <div className="vo-card mb-6 grid gap-3 p-5 sm:grid-cols-3 md:p-6">
          <div className="vo-stat-tile p-4">
            <p className="text-xs text-[var(--vo-muted)]">Skupaj Care Box</p>
            <p className="mt-1 text-3xl font-bold text-[var(--vo-accent)]">{counts.total}</p>
          </div>
          <div className="vo-stat-tile p-4">
            <p className="text-xs text-[var(--vo-muted)]">Box offline</p>
            <p className={`mt-1 text-3xl font-bold ${counts.offline ? "text-[var(--vo-danger)]" : "text-[var(--vo-ok)]"}`}>
              {counts.offline}
            </p>
          </div>
          <div className="vo-stat-tile p-4">
            <p className="text-xs text-[var(--vo-muted)]">Težave z napravami</p>
            <p
              className={`mt-1 text-3xl font-bold ${counts.deviceIssues ? "text-[var(--vo-warn)]" : "text-[var(--vo-ok)]"}`}
            >
              {counts.deviceIssues}
            </p>
          </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <section className="vo-card overflow-hidden">
        {loading && !rows.length ? (
          <p className="p-6 text-sm text-[var(--vo-muted)]">Nalagam…</p>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--vo-muted)]">
            <RadioTower className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3">Še ni nobenega Care Box-a. Odprite stranko → zavihek Care Box → prenesite paket.</p>
            <Link href="/portal/stranke" className="mt-4 inline-block text-[var(--vo-accent)] hover:underline">
              Objekti &amp; stranke →
            </Link>
          </div>
        ) : (
          <div className="vo-table-wrap">
            <table className="vo-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="px-4 py-3">Stranka</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Box</th>
                  <th className="px-4 py-3">Naprave</th>
                  <th className="px-4 py-3">Zadnji kontakt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--vo-border)]">
                {rows.map((r) => {
                  const href = `${clientProfilePath({ id: r.clientId, slug: r.clientSlug ?? "" })}?tab=rpi`;
                  return (
                    <tr key={r.clientId} className="hover:bg-[var(--vo-surface-2)]/50">
                      <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{r.clientName}</td>
                      <td className="px-4 py-3 text-[var(--vo-muted)]">{r.careSlaLabel}</td>
                      <td className="px-4 py-3">
                        {r.online ? (
                          <span className="inline-flex items-center gap-1 text-[var(--vo-ok)]">
                            <CheckCircle2 className="h-4 w-4" /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[var(--vo-danger)]">
                            <AlertTriangle className="h-4 w-4" /> Offline
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.devicesOffline > 0 ? (
                          <span className="text-[var(--vo-warn)]">{r.devicesOffline} težav</span>
                        ) : (
                          <span className="text-[var(--vo-muted)]">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--vo-muted)]">
                        {r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleString("sl-SI") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={href} className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
                          Odpri →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { PortalDashboardSkeleton } from "@/components/portal/PortalDashboardSkeleton";
import { DashboardWidgetGrid } from "@/components/portal/dashboard/DashboardWidgetGrid";
import type { DashboardBlocksCtx } from "@/components/portal/dashboard/DashboardWidgetBlocks";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { usePortalRole } from "@/context/PortalRoleContext";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  getDashboardLayout,
  saveDashboardLayout,
  updateWidgetConfig,
  type DashboardLayout,
} from "@/lib/dashboard-widgets";
import { exportDashboardCsv, exportRemindersCsv } from "@/lib/portal-export";
import { getFavoriteClientIds } from "@/lib/portal-prefs";
import type { PortalDashboardPayload } from "@/lib/repositories/dashboard";

export function PortalDashboardView() {
  const { role } = usePortalRole();
  const [initial, setInitial] = useState<PortalDashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/portal/dashboard");
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "Napaka pri nalaganju nadzorne plošče.");
    }
    return (await res.json()) as PortalDashboardPayload;
  }, []);

  useEffect(() => {
    setLayout(getDashboardLayout());
    setFavoriteIds(getFavoriteClientIds());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadDashboard()
      .then((payload) => {
        if (!cancelled) {
          setInitial(payload);
          setLoadError(null);
          setLastRefresh(new Date());
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Napaka pri nalaganju.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clients = useMemo(() => {
    if (!initial) return [];
    const clientWidget = layout.widgets.find((w) => w.type === "client_status");
    const favOnly = Boolean(clientWidget?.config.favoritesOnly);
    let list = initial.clients;
    if (favOnly) list = list.filter((c) => favoriteIds.includes(c.id));
    return list;
  }, [initial, layout.widgets, favoriteIds]);

  const reminders = useMemo(() => {
    if (!initial) return [];
    const remWidget = layout.widgets.find((w) => w.type === "reminders");
    const filter = (remWidget?.config.filter as "all" | "open") ?? "open";
    if (filter === "all") return initial.reminders;
    return initial.reminders.filter((r) => !r.completed);
  }, [initial, layout.widgets]);

  const compact = useMemo(() => {
    const clientWidget = layout.widgets.find((w) => w.type === "client_status");
    return Boolean(clientWidget?.config.compact);
  }, [layout.widgets]);

  function handleLayoutChange(next: DashboardLayout) {
    saveDashboardLayout(next);
    setLayout(next);
  }

  const handleWidgetConfig = useCallback((id: string, patch: Record<string, unknown>) => {
    setLayout((prev) => {
      const next = updateWidgetConfig(prev, id, patch);
      saveDashboardLayout(next);
      return next;
    });
  }, []);

  const ctx: DashboardBlocksCtx | null = useMemo(() => {
    if (!initial) return null;
    return {
      data: initial,
      clients,
      reminders,
      compact,
      onExportCsv: () => exportDashboardCsv({ clients, totals: initial.totals }),
      onExportReminders: () => exportRemindersCsv(initial.reminders),
      onWidgetConfig: handleWidgetConfig,
    };
  }, [initial, clients, reminders, compact, handleWidgetConfig]);

  if (!initial || !ctx) {
    return (
      <>
        {loadError ? (
          <p className="vo-alert-error mb-4">
            {loadError}
          </p>
        ) : null}
        <PortalDashboardSkeleton />
      </>
    );
  }

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      const payload = await loadDashboard();
      setInitial(payload);
      setLoadError(null);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Osvežitev ni uspela.");
    } finally {
      window.setTimeout(() => setRefreshing(false), 400);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PortalPageHeader
        kicker="Nadzorna plošča"
        title="Pregled sistema"
        gradientTitle
        description={
          <>
            Dobrodošli nazaj{role === "admin" ? ", administrator" : ""}.
            {!initial.dbConfigured ? (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (Demo podatki — nastavite DATABASE_URL za živo stanje.)
              </span>
            ) : null}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={refreshing}
              className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Osveži
            </button>
            <button
              type="button"
              onClick={() => exportDashboardCsv({ clients, totals: initial.totals })}
              className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-2 text-right">
              <div className="text-2xl font-mono font-bold tabular-nums text-[var(--vo-accent)]">
                {now.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[10px] text-[var(--vo-muted)]">
                Osveženo {lastRefresh.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        }
      />

      <DashboardWidgetGrid layout={layout} onLayoutChange={handleLayoutChange} ctx={ctx} />
    </div>
  );
}

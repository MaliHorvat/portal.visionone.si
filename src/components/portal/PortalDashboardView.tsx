"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalDashboardSkeleton } from "@/components/portal/PortalDashboardSkeleton";
import {
  Activity,
  Boxes,
  Camera,
  Download,
  HardDrive,
  LayoutDashboard,
  Link2,
  RefreshCw,
  Router,
  Server,
  Settings,
  Star,
  Video,
  Wifi,
} from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { PortalCareBoxAlert } from "@/components/portal/PortalCareBoxAlert";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { PortalQuickActions } from "@/components/portal/PortalQuickActions";
import { clientProfilePath } from "@/lib/client-url";
import { exportDashboardCsv, exportRemindersCsv } from "@/lib/portal-export";
import {
  getDashboardCompact,
  getDashboardFavoritesOnly,
  getFavoriteClientIds,
  setDashboardCompact,
  setDashboardFavoritesOnly,
} from "@/lib/portal-prefs";
import type {
  ClientDashboardCard,
  PortalDashboardPayload,
} from "@/lib/repositories/dashboard";

export function PortalDashboardView() {
  const { role } = usePortalRole();
  const [initial, setInitial] = useState<PortalDashboardPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const [reminderFilter, setReminderFilter] = useState<"all" | "open">("open");
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
    setFavOnly(getDashboardFavoritesOnly());
    setCompact(getDashboardCompact());
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
    let list = initial.clients;
    if (favOnly) list = list.filter((c) => favoriteIds.includes(c.id));
    return list;
  }, [initial, favOnly, favoriteIds]);

  const reminders = useMemo(() => {
    if (!initial) return [];
    if (reminderFilter === "all") return initial.reminders;
    return initial.reminders.filter((r) => !r.completed);
  }, [initial, reminderFilter]);

  if (!initial) {
    return (
      <>
        {loadError ? (
          <p className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
            {loadError}
          </p>
        ) : null}
        <PortalDashboardSkeleton />
      </>
    );
  }

  const totals = initial.totals;

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
    <div className="space-y-8 pb-10">
      <PortalCareBoxAlert />
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
            onClick={() => exportDashboardCsv({ clients, totals })}
            className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <label className="inline-flex items-center gap-1 text-xs text-[var(--vo-muted)]">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => {
                setFavOnly(e.target.checked);
                setDashboardFavoritesOnly(e.target.checked);
              }}
            />
            <Star className="h-3 w-3" /> Priljubljene
          </label>
          <label className="inline-flex items-center gap-1 text-xs text-[var(--vo-muted)]">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => {
                setCompact(e.target.checked);
                setDashboardCompact(e.target.checked);
              }}
            />
            Kompaktno
          </label>
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

      <section>
        <h2 className="vo-section-label mb-3 flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Status strank &amp; kamer
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {clients.map((c) => (
            <ClientStatusCard key={c.id} card={c} />
          ))}
          {clients.length === 0 ? (
            <p className="py-8 text-sm text-[var(--vo-muted)]">Ni strank za prikaz.</p>
          ) : null}
        </div>
      </section>

      <section className={`vo-card ${compact ? "p-3" : "p-5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Vzdrževanje &amp; opomniki</h2>
          <div className="flex gap-2 text-xs">
            <select
              value={reminderFilter}
              onChange={(e) => setReminderFilter(e.target.value as "all" | "open")}
              className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1"
            >
              <option value="open">Odprti</option>
              <option value="all">Vsi</option>
            </select>
            <button
              type="button"
              className="rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)]"
              onClick={() => exportRemindersCsv(initial.reminders)}
            >
              Izvozi
            </button>
            <Link href="/portal/opomniki" className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-accent)] hover:bg-[var(--vo-surface-2)]">
              Vsi →
            </Link>
          </div>
        </div>
        {reminders.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--vo-muted)]">
            <Activity className="h-4 w-4 opacity-60" aria-hidden />
            Trenutno ni aktivnih opomnikov za vzdrževanje.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--vo-border)]">
            {reminders.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-[var(--vo-fg)]">{r.title}</span>
                <span className="text-xs text-[var(--vo-muted)]">
                  {r.clientName} · {r.dueDate}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="vo-card p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Hiter pregled</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="vo-stat-tile p-4">
              <p className="text-xs text-[var(--vo-muted)]">Skupaj objektov</p>
              <p className="mt-1 text-3xl font-bold text-[var(--vo-accent)]">{totals.clients}</p>
            </div>
            <div className="vo-stat-tile p-4">
              <p className="text-xs text-[var(--vo-muted)]">NVR / Switch</p>
              <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                NVR {totals.nvrsOnline}/{totals.nvrsOnline + totals.nvrsOffline}
                <span className="mx-2 text-[var(--vo-muted)]">·</span>
                SW {totals.switchesOnline}/{totals.switchesOnline + totals.switchesOffline}
              </p>
            </div>
            <div className="vo-stat-tile p-4">
              <p className="text-xs text-[var(--vo-muted)]">Kamere</p>
              <p className="mt-1 text-lg">
                <span className="font-bold text-[var(--vo-ok)]">{totals.camerasOnline} online</span>
                <span className="text-[var(--vo-muted)]"> · </span>
                <span className="font-bold text-[var(--vo-danger)]">{totals.camerasOffline} offline</span>
              </p>
            </div>
            <div className="vo-stat-tile p-4">
              <p className="text-xs text-[var(--vo-muted)]">Diski</p>
              <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                OK {totals.disksOk}
                <span className="text-[var(--vo-muted)]"> / </span>
                <span className="text-[var(--vo-warn)]">{totals.disksWarnFail} opozorilo</span>
              </p>
            </div>
            <div className="vo-stat-tile p-4">
              <p className="text-xs text-[var(--vo-muted)]">Zahtevki</p>
              <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                Odprti {totals.requestsOpen}
                <span className="text-[var(--vo-muted)]"> / </span>
                <span className="text-[var(--vo-danger)]">Nujni {totals.requestsUrgent}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="vo-card p-5">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zadnje aktivnosti</h2>
          <ul className="mt-4 max-h-[320px] space-y-3 overflow-y-auto text-sm">
            {initial.activities.length === 0 ? (
              <li className="text-[var(--vo-muted)]">Ni zapisov.</li>
            ) : (
              initial.activities.map((a) => (
                <li key={a.id} className="border-b border-[var(--vo-border)] pb-3 last:border-0">
                  <span
                    className={`mr-2 inline-block h-2 w-2 rounded-full ${
                      a.level === "error"
                        ? "bg-[var(--vo-danger)]"
                        : a.level === "warn"
                          ? "bg-[var(--vo-warn)]"
                          : "bg-[var(--vo-accent)]"
                    }`}
                  />
                  <span className="text-[var(--vo-fg)]">{a.message}</span>
                  <div className="mt-1 text-[10px] text-[var(--vo-muted)]">
                    {new Date(a.at).toLocaleString("sl-SI")}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="vo-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Operativni inbox — zahtevki</h2>
          <Link href="/portal/zahtevki" className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
            Odpri vse
          </Link>
        </div>
        {initial.requests.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--vo-muted)]">Ni odprtih zahtevkov.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {initial.requests.map((r) => (
              <li key={r.id} className="vo-stat-tile px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--vo-fg)]">{r.title}</span>
                  <span className="text-xs text-[var(--vo-muted)]">
                    {r.priority} · {r.status}
                  </span>
                </div>
                <p className="text-xs text-[var(--vo-muted)]">
                  {r.clientName || "Brez stranke"}
                  {r.dueDate ? ` · rok ${r.dueDate}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="vo-card flex flex-wrap items-center justify-between gap-3 border-[var(--vo-accent)]/15 bg-[var(--vo-accent-muted)]/30 px-4 py-3 text-xs">
        <div className="flex flex-wrap gap-4 text-[var(--vo-muted)]">
          <span className="flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5 text-[var(--vo-ok)]" aria-hidden /> API povezava
          </span>
          <span>Osvežitev podatkov ob nalaganju</span>
          <span>Verzija portala {initial.appVersion}</span>
        </div>
        <span className="rounded-full bg-[var(--vo-ok-muted)] px-3 py-1 font-semibold text-[var(--vo-ok)]">
          ONLINE
        </span>
      </section>

      <PortalQuickActions />

      <section>
        <h2 className="vo-section-label mb-3">Hitre povezave</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCard
            href="/portal/stranke"
            title="Projekti &amp; stranke"
            desc="Objekti, kamere, načrt in oprema."
            icon={Video}
            adminOnly={role === "admin"}
          />
          <QuickCard href="/portal/zahtevki" title="Zahtevki" desc="Operativni inbox in statusi." icon={Activity} />
          <QuickCard href="/portal/ponudbe" title="Ponudbe" desc="Postavke in izračuni." icon={Boxes} adminOnly />
          <QuickCard href="/portal/orodja" title="Omrežna orodja" desc="Diagnostika in orodja." icon={Router} />
          <QuickCard href="/portal/nastavitve" title="Nastavitve sistema" desc="Uporabniki in okolje." icon={Settings} adminOnly />
        </div>
      </section>
    </div>
  );
}

function QuickCard({
  href,
  title,
  desc,
  icon: Icon,
  adminOnly,
}: {
  href: string;
  title: string;
  desc: string;
  icon: ElementType;
  adminOnly?: boolean;
}) {
  const { role } = usePortalRole();
  if (adminOnly && role !== "admin") return null;
  return (
    <Link
      href={href}
      className="vo-card vo-card-hover group flex flex-col gap-2 p-5"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] text-[var(--vo-accent)] transition group-hover:scale-105">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <span className="font-semibold text-[var(--vo-fg)]">{title}</span>
      <span className="text-xs text-[var(--vo-muted)]">{desc}</span>
      <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--vo-accent)]">
        Odpri <Link2 className="h-3 w-3" aria-hidden />
      </span>
    </Link>
  );
}

function ClientStatusCard({ card }: { card: ClientDashboardCard }) {
  const ok = card.state === "ok";
  const href = `${clientProfilePath({ id: card.id, slug: "" })}?tab=shema`;
  return (
    <Link
      href={href}
      className={`vo-card vo-card-hover block min-w-[260px] max-w-[280px] shrink-0 p-4 ${
        ok ? "" : "border-red-400/50 bg-red-50 dark:border-red-500/40 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate font-semibold text-[var(--vo-fg)]">{card.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            ok ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]" : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
          }`}
        >
          {ok ? "V redu" : "Napaka"}
        </span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-[var(--vo-muted)]">
        <Camera className="h-3.5 w-3.5" aria-hidden />
        Kamere online:{" "}
        <span className="font-mono text-[var(--vo-fg)]">
          {card.camerasOnline} / {card.camerasTotal}
        </span>
      </p>
      <div className="mt-3 flex gap-3 text-[var(--vo-muted)]">
        <span title="NVR">
          <Server className="h-4 w-4" aria-hidden />
        </span>
        <span title="Switch">
          <Router className="h-4 w-4" aria-hidden />
        </span>
        <span title="Disk">
          <HardDrive className="h-4 w-4" aria-hidden />
        </span>
      </div>
      {!ok && card.issues.length > 0 ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2 py-2 dark:border-red-500/30 dark:bg-red-950/30">
          <p className="text-[10px] font-semibold uppercase text-red-700 dark:text-red-300">Nedavni izpadi</p>
          <ul className="mt-1 space-y-1 text-[11px] text-red-800/90 dark:text-red-100/90">
            {card.issues.map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 text-[10px] font-medium text-[var(--vo-accent)]">Odpri shemo →</p>
    </Link>
  );
}

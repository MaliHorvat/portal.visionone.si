"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import {
  Activity,
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
import { PortalCareBoxAlert } from "@/components/portal/PortalCareBoxAlert";
import { PortalQuickActions } from "@/components/portal/PortalQuickActions";
import { usePortalRole } from "@/context/PortalRoleContext";
import { clientProfilePath } from "@/lib/client-url";
import type { DashboardWidgetInstance } from "@/lib/dashboard-widgets";
import { exportDashboardCsv, exportRemindersCsv } from "@/lib/portal-export";
import type { ClientDashboardCard, PortalDashboardPayload } from "@/lib/repositories/dashboard";

export type DashboardBlocksCtx = {
  data: PortalDashboardPayload;
  clients: ClientDashboardCard[];
  reminders: PortalDashboardPayload["reminders"];
  compact: boolean;
  onExportCsv: () => void;
  onExportReminders: () => void;
  onWidgetConfig: (id: string, patch: Record<string, unknown>) => void;
};

export function DashboardWidgetBlock({
  widget,
  ctx,
}: {
  widget: DashboardWidgetInstance;
  ctx: DashboardBlocksCtx;
}) {
  switch (widget.type) {
    case "care_box_alert":
      return <PortalCareBoxAlert />;
    case "client_status":
      return <ClientStatusBlock widget={widget} ctx={ctx} />;
    case "reminders":
      return <RemindersBlock widget={widget} ctx={ctx} />;
    case "stats":
      return <StatsBlock ctx={ctx} />;
    case "activities":
      return <ActivitiesBlock ctx={ctx} />;
    case "requests":
      return <RequestsBlock ctx={ctx} />;
    case "system_bar":
      return <SystemBarBlock ctx={ctx} />;
    case "quick_actions":
      return <PortalQuickActions />;
    case "quick_links":
      return <QuickLinksBlock />;
    default:
      return null;
  }
}

function ClientStatusBlock({
  widget,
  ctx,
}: {
  widget: DashboardWidgetInstance;
  ctx: DashboardBlocksCtx;
}) {
  const favOnly = Boolean(widget.config.favoritesOnly);
  const compact = Boolean(widget.config.compact) || ctx.compact;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="vo-section-label flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          Status strank &amp; kamer
        </h2>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--vo-muted)]">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => onWidgetConfig(widget.id, { favoritesOnly: e.target.checked }, ctx)}
            />
            <Star className="h-3 w-3" /> Priljubljene
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => onWidgetConfig(widget.id, { compact: e.target.checked }, ctx)}
            />
            Kompaktno
          </label>
          <button
            type="button"
            onClick={ctx.onExportCsv}
            className="vo-btn-ghost inline-flex items-center gap-1 px-2 py-1"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {ctx.clients.map((c) => (
          <ClientStatusCard key={c.id} card={c} />
        ))}
        {ctx.clients.length === 0 ? (
          <p className="py-8 text-sm text-[var(--vo-muted)]">Ni strank za prikaz.</p>
        ) : null}
      </div>
    </section>
  );
}

function onWidgetConfig(id: string, patch: Record<string, unknown>, ctx: DashboardBlocksCtx) {
  ctx.onWidgetConfig(id, patch);
}

function RemindersBlock({
  widget,
  ctx,
}: {
  widget: DashboardWidgetInstance;
  ctx: DashboardBlocksCtx;
}) {
  const filter = (widget.config.filter as "all" | "open") ?? "open";
  const compact = ctx.compact;

  return (
    <section className={`vo-card ${compact ? "p-3" : "p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Vzdrževanje &amp; opomniki</h2>
        <div className="flex gap-2 text-xs">
          <select
            value={filter}
            onChange={(e) =>
              onWidgetConfig(widget.id, { filter: e.target.value as "all" | "open" }, ctx)
            }
            className="vo-select px-2 py-1 text-xs"
          >
            <option value="open">Odprti</option>
            <option value="all">Vsi</option>
          </select>
          <button
            type="button"
            className="rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)]"
            onClick={ctx.onExportReminders}
          >
            Izvozi
          </button>
          <Link
            href="/portal/opomniki"
            className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-accent)] hover:bg-[var(--vo-surface-2)]"
          >
            Vsi →
          </Link>
        </div>
      </div>
      {ctx.reminders.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--vo-muted)]">
          <Activity className="h-4 w-4 opacity-60" aria-hidden />
          Trenutno ni aktivnih opomnikov za vzdrževanje.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--vo-border)]">
          {ctx.reminders.map((r) => (
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
  );
}

function StatsBlock({ ctx }: { ctx: DashboardBlocksCtx }) {
  const totals = ctx.data.totals;
  return (
    <section className={`vo-card p-5 ${ctx.compact ? "p-3" : ""}`}>
      <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Hiter pregled</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatTile label="Skupaj objektov" value={String(totals.clients)} large />
        <StatTile
          label="NVR / Switch"
          value={`NVR ${totals.nvrsOnline}/${totals.nvrsOnline + totals.nvrsOffline} · SW ${totals.switchesOnline}/${totals.switchesOnline + totals.switchesOffline}`}
        />
        <StatTile
          label="Kamere"
          value={
            <>
              <span className="font-bold text-[var(--vo-ok)]">{totals.camerasOnline} online</span>
              <span className="text-[var(--vo-muted)]"> · </span>
              <span className="font-bold text-[var(--vo-danger)]">{totals.camerasOffline} offline</span>
            </>
          }
        />
        <StatTile
          label="Diski"
          value={`OK ${totals.disksOk} / ${totals.disksWarnFail} opozorilo`}
        />
        <StatTile
          label="Zahtevki"
          value={`Odprti ${totals.requestsOpen} / Nujni ${totals.requestsUrgent}`}
        />
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  large,
}: {
  label: string;
  value: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="vo-stat-tile p-4">
      <p className="text-xs text-[var(--vo-muted)]">{label}</p>
      <p className={`mt-1 font-semibold text-[var(--vo-fg)] ${large ? "text-3xl font-bold text-[var(--vo-accent)]" : "text-lg"}`}>
        {value}
      </p>
    </div>
  );
}

function ActivitiesBlock({ ctx }: { ctx: DashboardBlocksCtx }) {
  return (
    <section className="vo-card p-5">
      <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zadnje aktivnosti</h2>
      <ul className="mt-4 max-h-[320px] space-y-3 overflow-y-auto text-sm">
        {ctx.data.activities.length === 0 ? (
          <li className="text-[var(--vo-muted)]">Ni zapisov.</li>
        ) : (
          ctx.data.activities.map((a) => (
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
  );
}

function RequestsBlock({ ctx }: { ctx: DashboardBlocksCtx }) {
  return (
    <section className="vo-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Operativni inbox — zahtevki</h2>
        <Link href="/portal/zahtevki" className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
          Odpri vse
        </Link>
      </div>
      {ctx.data.requests.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--vo-muted)]">Ni odprtih zahtevkov.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {ctx.data.requests.map((r) => (
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
  );
}

function SystemBarBlock({ ctx }: { ctx: DashboardBlocksCtx }) {
  return (
    <section className="vo-card flex flex-wrap items-center justify-between gap-3 border-[var(--vo-accent)]/15 bg-[var(--vo-accent-muted)]/30 px-4 py-3 text-xs">
      <div className="flex flex-wrap gap-4 text-[var(--vo-muted)]">
        <span className="flex items-center gap-1">
          <Wifi className="h-3.5 w-3.5 text-[var(--vo-ok)]" aria-hidden /> API povezava
        </span>
        <span>Osvežitev podatkov ob nalaganju</span>
        <span>Verzija portala {ctx.data.appVersion}</span>
      </div>
      <span className="rounded-full bg-[var(--vo-ok-muted)] px-3 py-1 font-semibold text-[var(--vo-ok)]">ONLINE</span>
    </section>
  );
}

function QuickLinksBlock() {
  const { role } = usePortalRole();
  return (
    <section>
      <h2 className="vo-section-label mb-3">Hitre povezave</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickCard href="/portal/stranke" title="Projekti & stranke" desc="Objekti, kamere, načrt in oprema." icon={Video} adminOnly={role === "admin"} />
        <QuickCard href="/portal/zahtevki" title="Zahtevki" desc="Operativni inbox in statusi." icon={Activity} />
        <QuickCard href="/portal/care-box" title="Care Box" desc="Monitoring preko Raspberry Pi." icon={Activity} adminOnly />
        <QuickCard href="/portal/orodja" title="Omrežna orodja" desc="Diagnostika in orodja." icon={Router} />
        <QuickCard href="/portal/nastavitve" title="Nastavitve sistema" desc="Uporabniki in okolje." icon={Settings} adminOnly />
      </div>
    </section>
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
    <Link href={href} className="vo-card vo-card-hover group flex flex-col gap-2 p-5">
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

/** Stats + activities v eni vrstici (kot prej). */
export function DashboardStatsActivitiesRow({ ctx }: { ctx: DashboardBlocksCtx }) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <StatsBlock ctx={ctx} />
      </div>
      <ActivitiesBlock ctx={ctx} />
    </div>
  );
}

export function shouldPairStatsActivities(layout: { widgets: { type: string }[] }): boolean {
  const types = layout.widgets.map((w) => w.type);
  const si = types.indexOf("stats");
  const ai = types.indexOf("activities");
  return si >= 0 && ai >= 0 && Math.abs(si - ai) === 1 && si < ai;
}

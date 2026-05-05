"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  Camera,
  HardDrive,
  LayoutDashboard,
  Link2,
  Router,
  Server,
  Settings,
  Video,
  Wifi,
} from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";
import type {
  ClientDashboardCard,
  PortalDashboardPayload,
} from "@/lib/repositories/dashboard";

type Props = {
  initial: PortalDashboardPayload;
};

export function PortalDashboardView({ initial }: Props) {
  const { role } = usePortalRole();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clients = useMemo(() => {
    if (role === "client") {
      return initial.clients.filter((c) => c.id === mockClientPortalClientId);
    }
    return initial.clients;
  }, [initial.clients, role]);

  const totals = initial.totals;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--vo-border)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--vo-fg)]">Pregled sistema</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Dobrodošli nazaj{role === "admin" ? ", administrator" : ""}.
            {!initial.dbConfigured ? (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (Demo podatki — nastavite DATABASE_URL za živo stanje.)
              </span>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono tabular-nums text-[var(--vo-fg)]">
            {now.toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-xs text-[var(--vo-muted)]">
            {now.toLocaleDateString("sl-SI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--vo-muted)]">
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

      <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Vzdrževanje &amp; opomniki</h2>
        {initial.reminders.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--vo-muted)]">
            <Activity className="h-4 w-4 opacity-60" aria-hidden />
            Trenutno ni aktivnih opomnikov za vzdrževanje.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--vo-border)]">
            {initial.reminders.map((r) => (
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
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)] xl:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Hiter pregled</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4">
              <p className="text-xs text-[var(--vo-muted)]">Skupaj objektov</p>
              <p className="mt-1 text-3xl font-bold text-[var(--vo-accent)]">{totals.clients}</p>
            </div>
            <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4">
              <p className="text-xs text-[var(--vo-muted)]">NVR / Switch</p>
              <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                NVR {totals.nvrsOnline}/{totals.nvrsOnline + totals.nvrsOffline}
                <span className="mx-2 text-[var(--vo-muted)]">·</span>
                SW {totals.switchesOnline}/{totals.switchesOnline + totals.switchesOffline}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4">
              <p className="text-xs text-[var(--vo-muted)]">Kamere</p>
              <p className="mt-1 text-lg">
                <span className="font-bold text-[var(--vo-ok)]">{totals.camerasOnline} online</span>
                <span className="text-[var(--vo-muted)]"> · </span>
                <span className="font-bold text-[var(--vo-danger)]">{totals.camerasOffline} offline</span>
              </p>
            </div>
            <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-4">
              <p className="text-xs text-[var(--vo-muted)]">Diski</p>
              <p className="mt-1 text-lg font-semibold text-[var(--vo-fg)]">
                OK {totals.disksOk}
                <span className="text-[var(--vo-muted)]"> / </span>
                <span className="text-[var(--vo-warn)]">{totals.disksWarnFail} opozorilo</span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
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

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-4 py-3 text-xs">
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

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--vo-muted)]">
          Hitre povezave
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickCard
            href="/portal/stranke"
            title="Projekti &amp; stranke"
            desc="Objekti, kamere, načrt in oprema."
            icon={Video}
            adminOnly={role !== "client"}
          />
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
  if (adminOnly && role === "client") return null;
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)] transition hover:border-[var(--vo-accent)] hover:bg-[var(--vo-surface-2)]"
    >
      <Icon className="h-8 w-8 text-[var(--vo-accent)] opacity-90 group-hover:opacity-100" aria-hidden />
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
  return (
    <div
      className={`min-w-[260px] max-w-[280px] shrink-0 rounded-xl border p-4 shadow-[var(--vo-card-shadow)] ${
        ok ? "border-[var(--vo-border)] bg-[var(--vo-surface)]" : "border-red-500/40 bg-red-950/10"
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
        <div className="mt-3 rounded-lg border border-red-500/30 bg-black/20 px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-red-300">Nedavni izpadi</p>
          <ul className="mt-1 space-y-1 text-[11px] text-red-100/90">
            {card.issues.map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import {
  mockDashboardStats,
  mockSiteTraffic,
  mockSystemEvents,
  mockClientPortalClientId,
} from "@/lib/mock-data";
import { usePortalRole } from "@/context/PortalRoleContext";
import type { SiteTrafficLight } from "@/lib/types";

export default function PortalDashboardPage() {
  const { role } = usePortalRole();

  const traffic: SiteTrafficLight[] =
    role === "client"
      ? mockSiteTraffic.filter((s) => s.clientId === mockClientPortalClientId)
      : mockSiteTraffic;

  const stats =
    role === "client"
      ? {
          ...mockDashboardStats,
          activeClients: 1,
        }
      : mockDashboardStats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Nadzorna plošča</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Semaforji po strankah, agregatna statistika in zadnji dogodki (mock).
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--vo-muted)]">
          Semaforji strank
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {traffic.map((s) => (
            <div
              key={s.clientId}
              className="flex items-start gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
            >
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${
                  s.state === "ok" ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"
                }`}
                title={s.state === "ok" ? "Vse v redu" : "Alarm"}
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--vo-fg)]">{s.clientName}</p>
                <p className="mt-1 text-xs text-[var(--vo-muted)]">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Krovna statistika</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[var(--vo-muted)]">Aktivne stranke</dt>
              <dd className="text-2xl font-bold text-[var(--vo-accent)]">{stats.activeClients}</dd>
            </div>
            <div>
              <dt className="text-[var(--vo-muted)]">Kamere online</dt>
              <dd className="text-2xl font-bold text-[var(--vo-ok)]">{stats.camerasOnline}</dd>
            </div>
            <div>
              <dt className="text-[var(--vo-muted)]">Kamere offline</dt>
              <dd className="text-2xl font-bold text-[var(--vo-danger)]">{stats.camerasOffline}</dd>
            </div>
            <div>
              <dt className="text-[var(--vo-muted)]">NVR online / offline</dt>
              <dd className="text-lg font-bold text-[var(--vo-fg)]">
                {stats.nvrsOnline}{" "}
                <span className="text-[var(--vo-muted)]">/</span> {stats.nvrsOffline}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Zadnji sistemski dogodki</h2>
          <ul className="mt-4 space-y-3">
            {mockSystemEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-3 border-b border-[var(--vo-border)] pb-3 text-sm last:border-0 last:pb-0"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    ev.level === "error"
                      ? "bg-[var(--vo-danger)]"
                      : ev.level === "warn"
                        ? "bg-[var(--vo-warn)]"
                        : "bg-[var(--vo-accent)]"
                  }`}
                />
                <div>
                  <p className="text-[var(--vo-fg)]">{ev.message}</p>
                  <p className="text-xs text-[var(--vo-muted)]">
                    {new Date(ev.at).toLocaleString("sl-SI")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

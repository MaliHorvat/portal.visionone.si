"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";
import type { MojSystemStatus } from "@/lib/repositories/moj-status";

export function MojStanjeView() {
  const [data, setData] = useState<MojSystemStatus | null>(null);

  useEffect(() => {
    const load = () => {
      void fetch("/api/moj/status", { credentials: "include" })
        .then((r) => r.json())
        .then((j: MojSystemStatus) => setData(j))
        .catch(() => setData(null));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!data) {
    return <p className="text-sm text-[var(--vo-muted)]">Nalagam stanje sistema …</p>;
  }

  const allOk = data.active && data.summary.offline === 0 && data.agentOnline;
  const hasAlarm = data.active && (data.summary.offline > 0 || !data.agentOnline);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Stanje sistema</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Pregled dosegljivosti ključnih naprav na vašem objektu — brez dostopa do slik ali nastavitev.
        </p>
      </div>

      <div
        className={`rounded-2xl border px-5 py-4 ${
          !data.active
            ? "border-[var(--vo-border)] bg-[var(--vo-surface)]"
            : allOk
              ? "border-[var(--vo-ok)]/40 bg-[var(--vo-ok-muted)]"
              : "border-amber-400/50 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30"
        }`}
      >
        <p className="flex items-center gap-2 text-lg font-bold text-[var(--vo-fg)]">
          {allOk ? (
            <CheckCircle2 className="h-6 w-6 text-[var(--vo-ok)]" aria-hidden />
          ) : hasAlarm ? (
            <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
          ) : (
            <Activity className="h-6 w-6 text-[var(--vo-muted)]" aria-hidden />
          )}
          {allOk ? "Sistem deluje" : hasAlarm ? "Potrebna pozornost" : "Monitoring"}
        </p>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">{data.message}</p>
        {data.lastCheckAt ? (
          <p className="mt-1 text-xs text-[var(--vo-muted)]">
            Zadnji prenos: {new Date(data.lastCheckAt).toLocaleString("sl-SI")}
          </p>
        ) : null}
      </div>

      {data.active && data.devices.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--vo-fg)]">{data.summary.total}</p>
              <p className="text-xs text-[var(--vo-muted)]">Naprav v nadzoru</p>
            </div>
            <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-center">
              <p className="text-2xl font-extrabold text-[var(--vo-ok)]">{data.summary.online}</p>
              <p className="text-xs text-[var(--vo-muted)]">Dosegljive</p>
            </div>
            <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-center">
              <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{data.summary.offline}</p>
              <p className="text-xs text-[var(--vo-muted)]">Ni dosegljivih</p>
            </div>
          </div>

          <ul className="space-y-2">
            {data.devices.map((d) => (
              <li
                key={`${d.name}-${d.kind}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {d.status === "online" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--vo-ok)]" aria-hidden />
                  ) : (
                    <WifiOff className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                  )}
                  <div>
                    <p className="font-semibold text-[var(--vo-fg)]">{d.name}</p>
                    <p className="text-xs text-[var(--vo-muted)]">{d.kind}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    d.status === "online"
                      ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                  }`}
                >
                  {d.status === "online" ? "OK" : "IZPAD"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="text-xs text-[var(--vo-muted)]">
        Tehnični posegi in diagnostiko izvaja VisionOne. Ob izpadu vas kontaktiramo — ni vam treba spremljati IP
        naslovov ali kamer.
      </p>
    </div>
  );
}

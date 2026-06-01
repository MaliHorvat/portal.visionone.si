"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Calendar, HardDrive, Package, Phone, Shield, Wrench } from "lucide-react";
import type { MojSystemStatus } from "@/lib/repositories/moj-status";
import type { MojOverview } from "@/lib/repositories/moj-overview";

const STATUS_LABEL: Record<string, string> = {
  new: "Prejeto",
  in_progress: "V teku",
  waiting_customer: "Čaka na vas",
  done: "Zaključeno",
};

export function MojDashboardView() {
  const [data, setData] = useState<MojOverview | null>(null);
  const [sysStatus, setSysStatus] = useState<MojSystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/moj/overview", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/moj/status", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([ov, st]) => {
        const j = ov as MojOverview & { error?: string };
        if (j.error) {
          setError(j.error);
          return;
        }
        setData(j);
        setSysStatus(st as MojSystemStatus);
      })
      .catch(() => setError("Podatkov ni bilo mogoče naložiti."));
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-sm text-[var(--vo-muted)]">Nalagam …</p>;
  }

  if (!data.client) {
    return (
      <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-8 text-center">
        <p className="text-lg font-bold text-[var(--vo-fg)]">Račun ni povezan z objektom</p>
        <p className="mt-2 text-sm text-[var(--vo-muted)]">
          Kontaktirajte VisionOne — povežemo vaš dostop z vašim objektom.
        </p>
        <Link href="/moj/kontakt" className="vo-btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">
          Kontakt
        </Link>
      </div>
    );
  }

  const nextReminder = data.upcomingReminders[0];
  const nextPreventive = data.preventiveItems[0];
  const urgentPreventive = data.preventiveItems.filter((p) => p.urgent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Pozdravljeni</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Pregled dogovorjenih storitev in komunikacije z VisionOne — brez tehničnega nadzora naprav.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--vo-accent)]/25 bg-[var(--vo-accent-muted)] px-5 py-4 text-sm leading-relaxed text-[var(--vo-fg)]">
        <strong>24/7 skrb v ozadju.</strong> Tehnično stanje (kamere, omrežje, diski) spremljamo mi. Če je potreben
        poseg, vas kontaktiramo — vi ničesar ne nastavljate.
      </div>

      {sysStatus?.active ? (
        <Link
          href="/moj/stanje"
          className={`block rounded-2xl border px-5 py-4 transition hover:opacity-95 ${
            sysStatus.summary.offline > 0 || !sysStatus.agentOnline
              ? "border-amber-400/50 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30"
              : "border-[var(--vo-ok)]/40 bg-[var(--vo-ok-muted)]"
          }`}
        >
          <p className="flex items-center gap-2 font-bold text-[var(--vo-fg)]">
            <Activity className="h-5 w-5" aria-hidden />
            {sysStatus.summary.offline > 0 || !sysStatus.agentOnline
              ? "Stanje sistema — potrebna pozornost"
              : "Stanje sistema — vse v redu"}
          </p>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">{sysStatus.message}</p>
          <span className="mt-2 inline-flex text-xs font-semibold text-[var(--vo-accent)]">
            Podrobnosti po napravah →
          </span>
        </Link>
      ) : null}

      {urgentPreventive.length > 0 ? (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-950/40">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-100">
            <Shield className="h-4 w-4" aria-hidden />
            Priporočeni preventivni roki
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-950/90 dark:text-amber-100/90">
            {urgentPreventive.slice(0, 3).map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong> — {p.dueDate}
              </li>
            ))}
          </ul>
          <Link href="/moj/vzdrzevanje" className="mt-2 inline-flex text-xs font-semibold text-[var(--vo-accent)]">
            Celoten načrt vzdrževanja
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="vo-card-hover rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <Calendar className="h-6 w-6 text-[var(--vo-accent)]" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">Naslednji dogodek</p>
          {nextPreventive || nextReminder ? (
            <>
              <p className="mt-1 text-lg font-bold text-[var(--vo-fg)]">
                {(nextPreventive ?? nextReminder)!.title}
              </p>
              <p className="text-sm text-[var(--vo-muted)]">
                Rok: {(nextPreventive ?? nextReminder)!.dueDate}
                {nextPreventive ? ` · ${nextPreventive.kindLabel}` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-[var(--vo-muted)]">Trenutno ni razpisanih terminov.</p>
          )}
          <Link href="/moj/vzdrzevanje" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vo-accent)]">
            Vsi termini <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="vo-card-hover rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <HardDrive className="h-6 w-6 text-[var(--vo-accent)]" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">Varnost arhiva</p>
          {data.client.preventive.diskReplaceDueDate ? (
            <>
              <p className="mt-1 text-sm font-semibold text-[var(--vo-fg)]">Menjava diska priporočena</p>
              <p className="text-sm text-[var(--vo-muted)]">Rok: {data.client.preventive.diskReplaceDueDate}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-[var(--vo-muted)]">Trenutno brez načrtovane menjave diska.</p>
          )}
          <Link href="/moj/vzdrzevanje" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vo-accent)]">
            Podrobnosti <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="vo-card-hover rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <Package className="h-6 w-6 text-[var(--vo-accent)]" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">Vaš paket</p>
          <p className="mt-1 text-lg font-bold text-[var(--vo-fg)]">{data.client.package?.name ?? "Po dogovoru"}</p>
          {data.client.package?.description ? (
            <p className="mt-1 text-sm text-[var(--vo-muted)] line-clamp-2">{data.client.package.description}</p>
          ) : null}
        </div>

        <div className="vo-card-hover rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <Wrench className="h-6 w-6 text-[var(--vo-accent)]" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">Odprti zahtevki</p>
          <p className="mt-1 text-3xl font-extrabold text-[var(--vo-fg)]">{data.openRequests.length}</p>
          <Link href="/moj/zahtevki" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vo-accent)]">
            Zahtevki in nov predlog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="vo-card-hover rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <Phone className="h-6 w-6 text-[var(--vo-accent)]" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">Hitri kontakt</p>
          <p className="mt-1 text-sm font-semibold text-[var(--vo-fg)]">{data.client.contact || "VisionOne"}</p>
          {data.client.phone ? (
            <a href={`tel:${data.client.phone.replace(/\s/g, "")}`} className="mt-1 block text-sm text-[var(--vo-accent)]">
              {data.client.phone}
            </a>
          ) : null}
          <Link href="/moj/kontakt" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--vo-accent)]">
            Vsi kontakti <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {data.recentRequests.length > 0 ? (
        <section className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <h2 className="text-sm font-bold text-[var(--vo-fg)]">Zadnji zahtevki</h2>
          <ul className="mt-3 divide-y divide-[var(--vo-border)]">
            {data.recentRequests.slice(0, 4).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-medium text-[var(--vo-fg)]">{r.title}</span>
                <span className="shrink-0 rounded-full bg-[var(--vo-surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--vo-muted)]">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

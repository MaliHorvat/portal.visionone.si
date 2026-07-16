"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Phone,
  UserCircle,
  Wrench,
} from "lucide-react";
import { VisionOneLogo } from "@/components/brand/VisionOneLogo";

const nav = [
  { href: "/moj", label: "Pregled", icon: LayoutDashboard, exact: true },
  { href: "/moj/stanje", label: "Stanje sistema", icon: Activity },
  { href: "/moj/zahtevki", label: "Zahtevki", icon: Wrench },
  { href: "/moj/vzdrzevanje", label: "Vzdrževanje", icon: CalendarClock },
  { href: "/moj/kontakt", label: "Kontakt", icon: Phone },
  { href: "/moj/racun", label: "Račun", icon: UserCircle },
];

export function MojShell({
  children,
  clientName,
  isPreviewAdmin,
}: {
  children: React.ReactNode;
  clientName?: string;
  isPreviewAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-[var(--vo-bg)]">
      {isPreviewAdmin ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          Administratorski pregled — stranka vidi samo ta poenostavljen vmesnik na{" "}
          <strong>moj.visionone.si</strong>
        </div>
      ) : null}

      <aside
        className={`vo-portal-sidebar sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r md:flex ${
          isPreviewAdmin ? "pt-10" : ""
        }`}
      >
        <div className="flex min-h-[3.5rem] items-center border-b border-[var(--vo-sidebar-border)] px-4 py-3">
          <Link href="/moj" className="vo-brand-link min-w-0" aria-label="Moj VisionOne">
            <VisionOneLogo variant="both" size="sm" className="w-full min-w-0" />
          </Link>
        </div>
        <nav className="vo-sidebar-nav flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-4">
          <div className="vo-section-label px-3 pb-2">MENI</div>
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-[13px] ${
                  active ? "vo-nav-link-active" : "vo-nav-link"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[var(--vo-accent)]" : "opacity-80"}`} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--vo-sidebar-border)] p-3">
          {clientName ? (
            <p className="mb-2 truncate px-2 text-xs text-[var(--vo-sidebar-muted)]">{clientName}</p>
          ) : null}
          <form action="/api/portal-logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--vo-sidebar-fg)] transition hover:bg-[var(--vo-sidebar-hover)] hover:text-[var(--vo-fg)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Odjava
            </button>
          </form>
        </div>
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col ${isPreviewAdmin ? "pt-10" : ""}`}>
        <header className="vo-portal-header sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
          <div className="min-w-0 md:hidden">
            <VisionOneLogo variant="both" size="sm" />
            {clientName ? <p className="mt-0.5 truncate text-xs text-[var(--vo-muted)]">{clientName}</p> : null}
          </div>
          <p className="hidden text-sm font-semibold text-[var(--vo-fg)] md:block">Moj VisionOne</p>
          <form action="/api/portal-logout" method="post" className="md:hidden">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Odjava
            </button>
          </form>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 md:hidden">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  active ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "text-[var(--vo-muted)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="vo-page-enter mx-auto w-full max-w-5xl flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>

        <footer className="border-t border-[var(--vo-border)] py-4 text-center text-xs text-[var(--vo-muted)]">
          VisionOne skrbi za vaš objekt — tehnični nadzor in servis na naši strani.
        </footer>
      </div>
    </div>
  );
}

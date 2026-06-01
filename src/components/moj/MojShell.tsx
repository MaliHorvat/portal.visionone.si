"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarClock,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Phone,
  UserCircle,
  Wrench,
} from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-[var(--vo-bg)]">
      {isPreviewAdmin ? (
        <div className="border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          Administratorski pregled — stranka vidi samo ta poenostavljen vmesnik na{" "}
          <strong>moj.visionone.si</strong>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-[var(--vo-border)] bg-[var(--vo-header-bg)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/moj" className="flex items-center gap-2 font-bold text-[var(--vo-fg)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]">
              <HelpCircle className="h-5 w-5" aria-hidden />
            </span>
            <span>
              Moj VisionOne
              {clientName ? (
                <span className="mt-0.5 block text-xs font-normal text-[var(--vo-muted)]">{clientName}</span>
              ) : null}
            </span>
          </Link>
          <form action="/api/portal-logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Odjava
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:px-6 md:py-8">
        <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                    : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface)] hover:text-[var(--vo-fg)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-[var(--vo-border)] py-4 text-center text-xs text-[var(--vo-muted)]">
        VisionOne skrbi za vaš objekt — tehnični nadzor in servis na naši strani.
      </footer>
    </div>
  );
}

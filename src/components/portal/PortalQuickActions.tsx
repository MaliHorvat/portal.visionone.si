"use client";

import Link from "next/link";
import {
  Boxes,
  Clock,
  FileText,
  LayoutGrid,
  Network,
  StickyNote,
  Users,
  Wrench,
  Bell,
  Radio,
} from "lucide-react";

const actions = [
  { href: "/portal/stranke", label: "Objekti & stranke", icon: Users },
  { href: "/portal/zahtevki", label: "Zahtevki", icon: Wrench },
  { href: "/portal/ponudbe", label: "Ponudbe", icon: FileText },
  { href: "/portal/cas", label: "Sledenje času", icon: Clock },
  { href: "/portal/opomniki", label: "Opomniki", icon: Bell },
  { href: "/portal/inventar", label: "Skladišče", icon: Boxes },
  { href: "/portal/orodja", label: "Orodja / kalkulatorji", icon: Network },
  { href: "/portal/rack-dizajner", label: "Rack dizajner", icon: LayoutGrid },
  { href: "/portal/belezke", label: "Beležke", icon: StickyNote },
  { href: "/portal/agents", label: "Agenti", icon: Radio },
] as const;

export function PortalQuickActions() {
  return (
    <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-[var(--vo-card-shadow)]">
      <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Hitri dostopi</h2>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">Pogosto uporabljene sekcije portala.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2.5 text-xs font-medium text-[var(--vo-fg)] transition hover:border-[var(--vo-accent)] hover:bg-[var(--vo-surface-2)]"
          >
            <Icon className="h-4 w-4 shrink-0 text-[var(--vo-accent)]" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}

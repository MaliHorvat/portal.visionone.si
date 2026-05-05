"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Boxes,
  CalendarClock,
  Camera,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Network,
  Package,
  Users,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const navItems: NavItem[] = [
  { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard },
  { href: "/portal/stranke", label: "Stranke", icon: Users, adminOnly: true },
  {
    href: `/portal/stranke/${mockClientPortalClientId}`,
    label: "Moj objekt",
    icon: Camera,
    adminOnly: false,
  },
  { href: "/portal/orodja", label: "Orodja in diagnostika", icon: Wrench },
  { href: "/portal/paketi", label: "Paketi", icon: Package, adminOnly: true },
  { href: "/portal/ponudbe", label: "Ponudbe", icon: FileText, adminOnly: true },
  { href: "/portal/inventar", label: "Inventar", icon: Boxes, adminOnly: true },
  { href: "/portal/opomniki", label: "Opomniki", icon: CalendarClock },
  { href: "/portal/cas", label: "Beleženje časa", icon: ClipboardList, adminOnly: true },
  { href: "/portal/obvestila", label: "Obvestila (Telegram)", icon: Bell, adminOnly: true },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = usePortalRole();

  const visible = navItems.filter((item) => {
    if (item.label === "Moj objekt") return role === "client";
    if (item.adminOnly) return role === "admin";
    if (item.href === "/portal/stranke") return role === "admin";
    return true;
  });

  return (
    <div className="flex min-h-screen bg-[var(--vo-bg)]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--vo-border)] bg-[var(--vo-surface)] md:flex">
        <div className="border-b border-[var(--vo-border)] px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-[var(--vo-fg)]">
            Vision<span className="text-[var(--vo-accent)]">One</span>
            <span className="block text-xs font-normal text-[var(--vo-muted)]">Portal</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {visible.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
              return (
                <Link
                  key={href + label}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                      : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t border-[var(--vo-border)] p-3 text-xs text-[var(--vo-muted)]">
          VisionOne portal · Faza 1
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Network className="h-5 w-5 shrink-0 text-[var(--vo-accent)] md:hidden" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--vo-fg)]">VisionOne portal</p>
              <p className="truncate text-xs text-[var(--vo-muted)]">
                Pogled:{" "}
                <span className="font-medium text-[var(--vo-accent)]">
                  {role === "admin" ? "Administrator" : "Stranka"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action="/api/portal-logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
              >
                Odjava
              </button>
            </form>
          </div>
        </header>

        <div className="border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 md:hidden">
          <nav className="flex gap-1 overflow-x-auto">
            {visible.map(({ href, label }) => {
                const active =
                  href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
                return (
                  <Link
                    key={href + label + "m"}
                    href={href}
                    className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium ${
                      active ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "text-[var(--vo-muted)]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

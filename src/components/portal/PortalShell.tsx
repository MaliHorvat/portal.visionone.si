"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  Camera,
  ClipboardList,
  Cpu,
  FileText,
  Layers,
  LayoutDashboard,
  Network,
  Package,
  PlugZap,
  Router,
  RadioTower,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCircle,
  Users,
  Video,
  Wifi,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePortalRole } from "@/context/PortalRoleContext";
import { roleLabel } from "@/lib/portal-roles";
import { mockClientPortalSlug } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "PREGLED",
    items: [
      { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard },
      { href: "/portal/racun", label: "Moj račun", icon: UserCircle },
    ],
  },
  {
    title: "VODENJE PROJEKTOV",
    items: [
      { href: "/portal/stranke", label: "Objekti & stranke", icon: Users, adminOnly: true },
      { href: "/portal/ponudbe", label: "Ponudbe", icon: FileText, adminOnly: true },
      { href: "/portal/cas", label: "Sledenje času", icon: ClipboardList, adminOnly: true },
      { href: "/portal/opomniki", label: "Vzdrževanje", icon: CalendarClock },
      {
        href: `/portal/stranke/${mockClientPortalSlug}`,
        label: "Moj objekt",
        icon: Camera,
        adminOnly: false,
      },
    ],
  },
  {
    title: "NAČRTOVANJE",
    items: [
      { href: "/portal/rack-dizajner", label: "Rack dizajner", icon: Layers, adminOnly: true },
      { href: "/portal/orodja?tool=poe", label: "PoE kalkulator", icon: PlugZap, adminOnly: true },
      { href: "/portal/orodja?tool=storage", label: "Kalkulator shrambe", icon: Boxes, adminOnly: true },
      { href: "/portal/orodja?tool=lcc", label: "Kalkulator LCC", icon: SlidersHorizontal, adminOnly: true },
    ],
  },
  {
    title: "OMREŽJE & DIAGNOSTIKA",
    items: [
      { href: "/portal/orodja?tool=ip-scan", label: "IP scanner", icon: Router, adminOnly: true },
      { href: "/portal/orodja?tool=wifi", label: "Wi‑Fi analizator", icon: Network, adminOnly: true },
      { href: "/portal/orodja?tool=ping", label: "Ping watchdog", icon: Cpu, adminOnly: true },
      { href: "/portal/orodja?tool=ipam", label: "IPAM (IP manager)", icon: Network, adminOnly: true },
      { href: "/portal/orodja?tool=mac", label: "MAC lookup", icon: Network, adminOnly: true },
      { href: "/portal/orodja?tool=wol", label: "Wake on LAN", icon: Wifi, adminOnly: true },
    ],
  },
  {
    title: "ORODJA & NAPRAVE",
    items: [
      { href: "/portal/orodja?tool=nvr", label: "NVR manager", icon: Video, adminOnly: true },
      { href: "/portal/orodja?tool=lpr", label: "LPR prepoznava", icon: Camera, adminOnly: true },
      { href: "/portal/orodja?tool=bulk", label: "Bulk config", icon: Wrench, adminOnly: true },
      { href: "/portal/orodja?tool=qr", label: "QR generator", icon: Layers, adminOnly: true },
      { href: "/portal/orodja?tool=pw", label: "Generator gesel", icon: Shield, adminOnly: true },
    ],
  },
  {
    title: "BAZA ZNANJA",
    items: [
      { href: "/portal/belezke?tab=dokumentacija", label: "Dokumentacija", icon: BookOpen, adminOnly: true },
      { href: "/portal/belezke?tab=belezke", label: "Beležke", icon: BookOpen, adminOnly: true },
      { href: "/portal/belezke?tab=privzeta-gesla", label: "Privzeta gesla", icon: Shield, adminOnly: true },
      { href: "/portal/belezke?tab=firmware", label: "Firmware baza", icon: Package, adminOnly: true },
    ],
  },
  {
    title: "SISTEM",
    items: [
      { href: "/portal/inventar", label: "Skladišče", icon: Boxes, adminOnly: true },
      { href: "/portal/agents", label: "Agenti", icon: RadioTower, adminOnly: true },
      { href: "/portal/obvestila", label: "Obvestila (Telegram)", icon: Bell, adminOnly: true },
      { href: "/portal/kamera-definicije", label: "RTSP definicije", icon: Video, adminOnly: true },
      { href: "/portal/audit", label: "Audit log", icon: Shield, adminOnly: true },
      { href: "/portal/paketi", label: "Naročniški paketi", icon: Package, adminOnly: true },
      { href: "/portal/nastavitve", label: "Nastavitve", icon: Settings, adminOnly: true },
    ],
  },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { role } = usePortalRole();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; label: string; href: string; meta?: string }>>([]);
  const [showResults, setShowResults] = useState(false);

  const current = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const visible = useMemo(
    () =>
      navSections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (item.label === "Moj objekt") return role !== "admin";
          if (item.adminOnly) return role === "admin";
          if (item.href === "/portal/stranke") return role === "admin";
          return true;
        }),
      })),
    [role],
  );

  useEffect(() => {
    for (const section of visible) {
      for (const item of section.items) router.prefetch(item.href);
    }
  }, [router, visible]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = window.setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        items?: Array<{ id: string; label: string; href: string; meta?: string }>;
      };
      setResults(data.items ?? []);
      setShowResults(true);
    }, 200);
    return () => window.clearTimeout(id);
  }, [query]);

  return (
    <div className="flex min-h-screen bg-[var(--vo-bg)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--vo-border)] bg-[var(--vo-surface)] md:flex">
        <div className="border-b border-[var(--vo-border)] px-4 py-4">
          <Link href="/" className="text-sm font-semibold text-[var(--vo-fg)]">
            Vision<span className="text-[var(--vo-accent)]">One</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-3 overflow-auto px-2 py-3">
          {visible.map((section) => (
            <div key={section.title}>
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-[0.11em] text-[var(--vo-muted)]/90">
                {section.title}
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = href.includes("?")
                    ? current.startsWith(href)
                    : href === "/portal"
                      ? pathname === "/portal"
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href + label}
                      href={href}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium ${
                        active
                          ? "border border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-fg)]"
                          : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[var(--vo-border)] p-3">
          <div className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-center text-[11px] font-medium text-emerald-300">
            ● System Online
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Network className="h-5 w-5 shrink-0 text-[var(--vo-accent)] md:hidden" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--vo-fg)]">VisionOne portal</p>
              <p className="truncate text-xs text-[var(--vo-muted)]">
                Pogled:{" "}
                <span className="font-medium text-[var(--vo-accent)]">
                  {roleLabel(role)}
                </span>
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="relative hidden md:block">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
                placeholder="Iskanje (stranke, uporabniki, opomniki)…"
                className="w-80 rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-1.5 text-sm"
              />
              {showResults && results.length > 0 ? (
                <div className="absolute right-0 z-20 mt-1 max-h-80 w-80 overflow-auto rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1 shadow-xl">
                  {results.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="block rounded px-2 py-1.5 hover:bg-[var(--vo-surface-2)]"
                      onClick={() => setShowResults(false)}
                    >
                      <p className="text-sm text-[var(--vo-fg)]">{r.label}</p>
                      {r.meta ? <p className="text-xs text-[var(--vo-muted)]">{r.meta}</p> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
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
            {visible.flatMap((s) => s.items).map(({ href, label }) => {
              const active = href.includes("?")
                ? current.startsWith(href)
                : href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(href);
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

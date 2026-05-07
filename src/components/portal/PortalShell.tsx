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
import type { NavPermissionKey } from "@/lib/nav-permissions";
import { roleLabel } from "@/lib/portal-roles";
import { mockClientPortalSlug } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: React.ElementType; permission: NavPermissionKey; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "PREGLED",
    items: [
      { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard, permission: "dashboard" },
      { href: "/portal/racun", label: "Moj račun", icon: UserCircle, permission: "my-account" },
    ],
  },
  {
    title: "VODENJE PROJEKTOV",
    items: [
      { href: "/portal/stranke", label: "Objekti & stranke", icon: Users, permission: "clients", adminOnly: true },
      { href: "/portal/ponudbe", label: "Ponudbe", icon: FileText, permission: "offers", adminOnly: true },
      { href: "/portal/cas", label: "Sledenje času", icon: ClipboardList, permission: "time-tracking", adminOnly: true },
      { href: "/portal/opomniki", label: "Vzdrževanje", icon: CalendarClock, permission: "maintenance" },
      {
        href: `/portal/stranke/${mockClientPortalSlug}`,
        label: "Moj objekt",
        icon: Camera,
        permission: "my-site",
        adminOnly: false,
      },
    ],
  },
  {
    title: "NAČRTOVANJE",
    items: [
      { href: "/portal/rack-dizajner", label: "Rack dizajner", icon: Layers, permission: "rack-designer", adminOnly: true },
      { href: "/portal/orodja?tool=poe", label: "PoE kalkulator", icon: PlugZap, permission: "tools", adminOnly: true },
      { href: "/portal/orodja?tool=storage", label: "Kalkulator shrambe", icon: Boxes, permission: "tools", adminOnly: true },
      { href: "/portal/orodja?tool=lcc", label: "Kalkulator LCC", icon: SlidersHorizontal, permission: "tools", adminOnly: true },
    ],
  },
  {
    title: "OMREŽJE & DIAGNOSTIKA",
    items: [
      { href: "/portal/orodja?tool=ip-scan", label: "IP scanner", icon: Router, permission: "network-diagnostics", adminOnly: true },
      { href: "/portal/orodja?tool=wifi", label: "Wi‑Fi analizator", icon: Network, permission: "network-diagnostics", adminOnly: true },
      { href: "/portal/orodja?tool=ping", label: "Ping watchdog", icon: Cpu, permission: "network-diagnostics", adminOnly: true },
      { href: "/portal/orodja?tool=ipam", label: "IPAM (IP manager)", icon: Network, permission: "network-diagnostics", adminOnly: true },
      { href: "/portal/orodja?tool=mac", label: "MAC lookup", icon: Network, permission: "network-diagnostics", adminOnly: true },
      { href: "/portal/orodja?tool=wol", label: "Wake on LAN", icon: Wifi, permission: "network-diagnostics", adminOnly: true },
    ],
  },
  {
    title: "ORODJA & NAPRAVE",
    items: [
      { href: "/portal/orodja?tool=nvr", label: "NVR manager", icon: Video, permission: "devices-tools", adminOnly: true },
      { href: "/portal/orodja?tool=lpr", label: "LPR prepoznava", icon: Camera, permission: "devices-tools", adminOnly: true },
      { href: "/portal/orodja?tool=bulk", label: "Bulk config", icon: Wrench, permission: "devices-tools", adminOnly: true },
      { href: "/portal/orodja?tool=qr", label: "QR generator", icon: Layers, permission: "devices-tools", adminOnly: true },
      { href: "/portal/orodja?tool=pw", label: "Generator gesel", icon: Shield, permission: "devices-tools", adminOnly: true },
    ],
  },
  {
    title: "BAZA ZNANJA",
    items: [
      { href: "/portal/belezke?tab=dokumentacija", label: "Dokumentacija", icon: BookOpen, permission: "knowledge-base", adminOnly: true },
      { href: "/portal/belezke?tab=belezke", label: "Beležke", icon: BookOpen, permission: "knowledge-base", adminOnly: true },
      { href: "/portal/belezke?tab=privzeta-gesla", label: "Privzeta gesla", icon: Shield, permission: "knowledge-base", adminOnly: true },
      { href: "/portal/belezke?tab=firmware", label: "Firmware baza", icon: Package, permission: "knowledge-base", adminOnly: true },
    ],
  },
  {
    title: "SISTEM",
    items: [
      { href: "/portal/inventar", label: "Skladišče", icon: Boxes, permission: "inventory", adminOnly: true },
      { href: "/portal/agents", label: "Agenti", icon: RadioTower, permission: "agents", adminOnly: true },
      { href: "/portal/obvestila", label: "Obvestila (Telegram)", icon: Bell, permission: "notifications", adminOnly: true },
      { href: "/portal/kamera-definicije", label: "RTSP definicije", icon: Video, permission: "camera-definitions", adminOnly: true },
      { href: "/portal/audit", label: "Audit log", icon: Shield, permission: "audit-log", adminOnly: true },
      { href: "/portal/paketi", label: "Naročniški paketi", icon: Package, permission: "packages", adminOnly: true },
      { href: "/portal/nastavitve", label: "Nastavitve", icon: Settings, permission: "settings", adminOnly: true },
    ],
  },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { role, setRole, canSwitchRoles, navPermissions } = usePortalRole();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; label: string; href: string; meta?: string }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);

  const current = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const visible = useMemo(
    () =>
      navSections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (!navPermissions.includes(item.permission)) return false;
          if (item.label === "Moj objekt") return role !== "admin";
          if (item.adminOnly) return role === "admin";
          if (item.href === "/portal/stranke") return role === "admin";
          return true;
        }),
      })),
    [navPermissions, role],
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

  useEffect(() => {
    if (role !== "admin") return;
    const load = async () => {
      const res = await fetch("/api/portal-access-requests");
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        requests?: Array<{ status: "new" | "approved" | "rejected" }>;
      };
      const pending = (data.requests ?? []).filter((r) => r.status === "new").length;
      setPendingAccessRequests(pending);
    };
    void load();
    const id = window.setInterval(load, 10000);
    return () => window.clearInterval(id);
  }, [role]);

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
            {canSwitchRoles ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "operator" | "viewer")}
                className="hidden rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--vo-muted)] md:block"
                title="Testni preklop vloge (samo UI)"
              >
                <option value="admin">admin</option>
                <option value="operator">operator</option>
                <option value="viewer">viewer</option>
              </select>
            ) : null}
            {role === "admin" ? (
              <Link
                href="/portal/nastavitve"
                className="relative rounded-lg border border-[var(--vo-border)] p-1.5 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
                title="Novi zahtevki za dostop"
              >
                <Bell className="h-4 w-4" aria-hidden />
                {pendingAccessRequests > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {pendingAccessRequests}
                  </span>
                ) : null}
              </Link>
            ) : null}
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

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Package,
  RadioTower,
  Search,
  Settings,
  Shield,
  StickyNote,
  UserCircle,
  Users,
  Wrench,
  Video,
  Network,
} from "lucide-react";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { PortalCommandPalette } from "@/components/portal/PortalCommandPalette";
import { PortalShortcutsHelp } from "@/components/portal/PortalShortcutsHelp";
import { usePortalRole } from "@/context/PortalRoleContext";
import type { NavPermissionKey } from "@/lib/nav-permissions";
import { getSidebarCollapsed, setSidebarCollapsed } from "@/lib/portal-prefs";
import { roleLabel } from "@/lib/portal-roles";
import { usePortalNavCounts } from "@/lib/use-portal-counts";

type NavItem = { href: string; label: string; icon: React.ElementType; permission: NavPermissionKey; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "PREGLED",
    items: [
      { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard, permission: "dashboard" },
      { href: "/portal/vms", label: "VMS", icon: Video, permission: "vms" },
      { href: "/portal/kerberos", label: "Kerberos Hub", icon: Shield, permission: "kerberos-hub" },
    ],
  },
  {
    title: "VODENJE PROJEKTOV",
    items: [
      { href: "/portal/stranke", label: "Objekti & stranke", icon: Users, permission: "clients", adminOnly: true },
      { href: "/portal/zahtevki", label: "Zahtevki", icon: Wrench, permission: "service-requests" },
      { href: "/portal/ponudbe", label: "Ponudbe", icon: FileText, permission: "offers", adminOnly: true },
      { href: "/portal/opomniki", label: "Opomniki", icon: Bell, permission: "dashboard" },
      { href: "/portal/cas", label: "Sledenje času", icon: Clock, permission: "time-tracking" },
      { href: "/portal/belezke", label: "Beležke", icon: StickyNote, permission: "dashboard" },
    ],
  },
  {
    title: "ORODJA",
    items: [
      { href: "/portal/orodja", label: "Kalkulatorji", icon: Network, permission: "tools" },
      { href: "/portal/rack-dizajner", label: "Rack dizajner", icon: LayoutGrid, permission: "rack-designer" },
    ],
  },
  {
    title: "SISTEM",
    items: [
      { href: "/portal/racun", label: "Moj račun", icon: UserCircle, permission: "my-account" },
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
  const [sectionOrders, setSectionOrders] = useState<Record<string, string[]>>({});
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const navCounts = usePortalNavCounts(true);

  const current = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const visible = useMemo(
    () =>
      navSections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (role === "admin" && item.permission === "service-requests") return true;
          if (!navPermissions.includes(item.permission)) return false;
          return true;
        }),
      })),
    [navPermissions, role],
  );

  useEffect(() => {
    setSidebarCollapsedState(getSidebarCollapsed());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          setCommandOpen(false);
          setShortcutsOpen(false);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (e.key === "/" && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsedState(next);
    setSidebarCollapsed(next);
  }

  function navBadge(href: string): number | null {
    if (href === "/portal/zahtevki" && navCounts.openRequests > 0) return navCounts.openRequests;
    if (href === "/portal/opomniki" && navCounts.overdueReminders > 0) return navCounts.overdueReminders;
    return null;
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vo_nav_section_orders");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      if (parsed && typeof parsed === "object") setSectionOrders(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  const orderedVisible = useMemo(
    () =>
      visible.map((section) => {
        const order = sectionOrders[section.title] ?? [];
        const keyed = section.items.map((item) => ({
          item,
          key: `${item.href}__${item.label}`,
        }));
        const sorted = keyed.sort((a, b) => {
          const ia = order.indexOf(a.key);
          const ib = order.indexOf(b.key);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
        return { ...section, items: sorted.map((x) => x.item) };
      }),
    [visible, sectionOrders],
  );

  function persistSectionOrder(next: Record<string, string[]>) {
    setSectionOrders(next);
    try {
      localStorage.setItem("vo_nav_section_orders", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function moveNavItem(sectionTitle: string, href: string, label: string, dir: -1 | 1) {
    const section = orderedVisible.find((s) => s.title === sectionTitle);
    if (!section) return;
    const keys = section.items.map((x) => `${x.href}__${x.label}`);
    const currentKey = `${href}__${label}`;
    const idx = keys.indexOf(currentKey);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= keys.length) return;
    const nextKeys = [...keys];
    const [it] = nextKeys.splice(idx, 1);
    nextKeys.splice(target, 0, it);
    persistSectionOrder({ ...sectionOrders, [sectionTitle]: nextKeys });
  }

  useEffect(() => {
    const prefetchable = orderedVisible.flatMap((section) => section.items).slice(0, 6);
    for (const item of prefetchable) router.prefetch(item.href);
  }, [router, orderedVisible]);

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
    <div className="flex h-dvh overflow-hidden bg-[var(--vo-bg)]">
      <aside
        className={`sticky top-0 hidden h-dvh max-h-dvh shrink-0 flex-col border-r border-[var(--vo-border)] bg-[var(--vo-surface)] transition-[width] md:flex ${
          sidebarCollapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--vo-border)] px-3 py-3">
          <Link href="/" className={`flex items-center gap-2 ${sidebarCollapsed ? "mx-auto" : ""}`}>
            <img src="/visionone-mark.png" alt="VisionOne" className="h-9 w-9 rounded object-contain" />
            {!sidebarCollapsed ? (
              <img src="/visionone-wordmark.png" alt="VisionOne" className="h-6 w-auto object-contain" />
            ) : null}
          </Link>
          {!sidebarCollapsed ? (
            <button type="button" onClick={toggleSidebar} className="rounded border border-[var(--vo-border)] p-1 text-[var(--vo-muted)]" title="Skrči">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={toggleSidebar} className="mx-auto rounded border border-[var(--vo-border)] p-1 text-[var(--vo-muted)]" title="Razširi">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav className="vo-sidebar-nav flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-3">
          {orderedVisible.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed ? (
                <div className="px-3 pb-1 text-[10px] font-semibold tracking-[0.11em] text-[var(--vo-muted)]/90">
                  {section.title}
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }, idx) => {
                  const active = href.includes("?")
                    ? current.startsWith(href)
                    : href === "/portal"
                      ? pathname === "/portal"
                      : pathname.startsWith(href);
                  return (
                    <div key={href + label} className="group flex items-center gap-1">
                      <Link
                        href={href}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium ${
                          active
                            ? "border border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-fg)]"
                            : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {!sidebarCollapsed ? (
                          <>
                            <span className="truncate">{label}</span>
                            {navBadge(href) != null ? (
                              <span className="ml-auto rounded-full bg-red-500/90 px-1.5 py-0 text-[10px] font-bold text-white">
                                {navBadge(href)}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </Link>
                      {!sidebarCollapsed ? (
                      <div className="hidden items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          title="Premakni gor"
                          disabled={idx === 0}
                          onClick={() => moveNavItem(section.title, href, label, -1)}
                          className="rounded border border-[var(--vo-border)] p-0.5 text-[var(--vo-muted)] disabled:opacity-40"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Premakni dol"
                          disabled={idx === section.items.length - 1}
                          onClick={() => moveNavItem(section.title, href, label, 1)}
                          className="rounded border border-[var(--vo-border)] p-0.5 text-[var(--vo-muted)] disabled:opacity-40"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      ) : null}
                    </div>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <img src="/visionone-mark.png" alt="VisionOne" className="h-5 w-5 shrink-0 rounded object-contain" />
              <img src="/visionone-wordmark.png" alt="VisionOne" className="h-4 w-auto shrink-0 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="hidden truncate text-sm font-semibold text-[var(--vo-fg)] md:block">VisionOne portal</p>
              <p className="truncate text-xs text-[var(--vo-muted)]">
                Pogled:{" "}
                <span className="font-medium text-[var(--vo-accent)]">
                  {roleLabel(role)}
                </span>
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="hidden items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2 py-1.5 text-xs text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] md:inline-flex"
              title="Ctrl+K"
            >
              <Search className="h-3.5 w-3.5" /> Paleta
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="hidden rounded-lg border border-[var(--vo-border)] p-1.5 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] md:block"
              title="Bližnjice (?)"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="relative hidden md:block">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
                placeholder="Iskanje (/) …"
                className="w-72 rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-1.5 text-sm lg:w-80"
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
          <div className="mb-2 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Iskanje…"
              className="min-w-0 flex-1 rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-sm"
            />
            <button type="button" onClick={() => setCommandOpen(true)} className="rounded-lg border border-[var(--vo-border)] px-2 py-1.5 text-xs">
              ⌘K
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {orderedVisible.flatMap((s) => s.items).map(({ href, label }) => {
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

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <PortalBreadcrumbs />
          {children}
        </div>
      </div>
      <PortalCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <PortalShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

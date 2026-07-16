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
  HelpCircle,
  LayoutDashboard,
  Moon,
  Package,
  RadioTower,
  Search,
  Settings,
  Globe,
  Sun,
  Shield,
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
import { VisionOneLogo } from "@/components/brand/VisionOneLogo";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePortalNavCounts } from "@/lib/use-portal-counts";

type NavItem = { href: string; label: string; icon: React.ElementType; permission: NavPermissionKey; adminOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: "PREGLED",
    items: [
      { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard, permission: "dashboard" },
    ],
  },
  {
    title: "VODENJE PROJEKTOV",
    items: [
      { href: "/portal/stranke", label: "Objekti & stranke", icon: Users, permission: "clients", adminOnly: true },
      { href: "/portal/zahtevki", label: "Zahtevki", icon: Wrench, permission: "service-requests" },
      { href: "/portal/opomniki", label: "Opomniki", icon: Bell, permission: "dashboard" },
      { href: "/portal/care-box", label: "Care Box", icon: RadioTower, permission: "agents", adminOnly: true },
    ],
  },
  {
    title: "ORODJA",
    items: [{ href: "/portal/orodja", label: "Kalkulatorji", icon: Network, permission: "tools" }],
  },
  {
    title: "SISTEM",
    items: [
      { href: "/portal/racun", label: "Moj račun", icon: UserCircle, permission: "my-account" },
      { href: "/portal/inventar", label: "Skladišče", icon: Boxes, permission: "inventory", adminOnly: true },
      { href: "/portal/obvestila", label: "Obvestila (Telegram)", icon: Bell, permission: "notifications", adminOnly: true },
      { href: "/portal/kamera-definicije", label: "RTSP definicije", icon: Video, permission: "camera-definitions", adminOnly: true },
      { href: "/portal/audit", label: "Audit log", icon: Shield, permission: "audit-log", adminOnly: true },
      { href: "/portal/paketi", label: "Naročniški paketi", icon: Package, permission: "packages", adminOnly: true },
      { href: "/portal/spletna-stran", label: "Spletna stran", icon: Globe, permission: "settings", adminOnly: true },
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
  const { resolved, toggle: toggleTheme } = useTheme();
  const [careOffline, setCareOffline] = useState(0);

  const current = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const visible = useMemo(
    () =>
      navSections.map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (role === "admin") return true;
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
    if (href === "/portal/care-box" && careOffline > 0) return careOffline;
    return null;
  }

  useEffect(() => {
    if (role !== "admin") return;
    const load = () => {
      void fetch("/api/portal/care-box", { credentials: "include" })
        .then((r) => r.json())
        .then((j: { counts?: { offline?: number } }) => setCareOffline(j.counts?.offline ?? 0))
        .catch(() => setCareOffline(0));
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [role]);

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

  const roleInitial = roleLabel(role).slice(0, 1).toUpperCase();

  return (
    <div className="vo-portal-app flex h-dvh overflow-hidden bg-[var(--vo-bg)]">
      <aside
        className={`vo-portal-sidebar sticky top-0 hidden h-dvh max-h-dvh shrink-0 flex-col border-r transition-[width] md:flex ${
          sidebarCollapsed ? "w-[4.5rem]" : "w-[15.5rem]"
        }`}
      >
        <div className="flex min-h-[3.5rem] items-center gap-1 border-b border-[var(--vo-sidebar-border)] px-3 py-2.5">
          <Link
            href="/portal"
            className={`vo-brand-link flex min-w-0 items-center overflow-hidden py-0.5 ${sidebarCollapsed ? "mx-auto flex-none justify-center" : "flex-1"}`}
            aria-label="VisionOne — nadzorna plošča"
          >
            <VisionOneLogo
              variant={sidebarCollapsed ? "mark" : "both"}
              size="sm"
              className="w-full min-w-0"
            />
          </Link>
          {!sidebarCollapsed ? (
            <button type="button" onClick={toggleSidebar} className="vo-btn-ghost shrink-0 p-1.5" title="Skrči">
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={toggleSidebar} className="vo-btn-ghost mx-auto p-1.5" title="Razširi">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav className="vo-sidebar-nav flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {orderedVisible.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed ? <div className="vo-section-label px-3 pb-2">{section.title}</div> : null}
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }, idx) => {
                  const active = href.includes("?")
                    ? current.startsWith(href)
                    : href === "/portal"
                      ? pathname === "/portal"
                      : pathname.startsWith(href);
                  return (
                    <div key={href + label} className="group flex items-center gap-0.5">
                      <Link
                        href={href}
                        title={sidebarCollapsed ? label : undefined}
                        className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-[13px] ${
                          active ? "vo-nav-link-active" : "vo-nav-link"
                        } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                      >
                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[var(--vo-accent)]" : "opacity-80"}`} aria-hidden />
                        {!sidebarCollapsed ? (
                          <>
                            <span className="truncate">{label}</span>
                            {navBadge(href) != null ? (
                              <span className="ml-auto rounded-full bg-[var(--vo-accent)] px-1.5 py-0 text-[10px] font-bold text-white">
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
                            className="rounded p-0.5 text-[var(--vo-sidebar-muted)] hover:text-[var(--vo-fg)] disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Premakni dol"
                            disabled={idx === section.items.length - 1}
                            onClick={() => moveNavItem(section.title, href, label, 1)}
                            className="rounded p-0.5 text-[var(--vo-sidebar-muted)] hover:text-[var(--vo-fg)] disabled:opacity-30"
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
        <div className="space-y-2 border-t border-[var(--vo-sidebar-border)] p-3">
          {!sidebarCollapsed ? (
            <a
              href="https://visionone.si"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-[var(--vo-sidebar-muted)] transition hover:bg-[var(--vo-sidebar-hover)] hover:text-[var(--vo-accent)]"
            >
              ← visionone.si
            </a>
          ) : null}
          <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--vo-sidebar-active)] px-3 py-2 text-center text-[11px] font-semibold text-[var(--vo-accent)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--vo-accent)]" />
            {sidebarCollapsed ? null : <span>Sistem online</span>}
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="vo-portal-header sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="vo-header-icon-btn hidden md:inline-flex"
              title={sidebarCollapsed ? "Razširi meni" : "Skrči meni"}
              aria-label="Preklopi stranski meni"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <div className="md:hidden">
              <VisionOneLogo variant="both" size="sm" />
            </div>
            <div className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
              <label className="vo-header-search w-full">
                <Search className="h-4 w-4 shrink-0 text-[var(--vo-muted)]" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => window.setTimeout(() => setShowResults(false), 120)}
                  placeholder="Iskanje…"
                  aria-label="Iskanje"
                />
              </label>
              {showResults && results.length > 0 ? (
                <div className="vo-card absolute left-0 z-20 mt-1.5 max-h-80 w-full overflow-auto p-1.5">
                  {results.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="block rounded-md px-2.5 py-2 hover:bg-[var(--vo-surface-2)]"
                      onClick={() => setShowResults(false)}
                    >
                      <p className="text-sm text-[var(--vo-fg)]">{r.label}</p>
                      {r.meta ? <p className="text-xs text-[var(--vo-muted)]">{r.meta}</p> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="vo-header-icon-btn hidden lg:inline-flex"
              title="Ukazi (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="vo-header-icon-btn hidden md:inline-flex"
              title="Bližnjice (?)"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="vo-header-icon-btn"
              title={resolved === "dark" ? "Svetla tema" : "Temna tema"}
              aria-label="Preklopi temo"
            >
              {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {role === "admin" ? (
              <Link href="/portal/nastavitve" className="vo-header-icon-btn relative" title="Novi zahtevki za dostop">
                <Bell className="h-4 w-4" aria-hidden />
                {pendingAccessRequests > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[var(--vo-accent)] px-1 text-[10px] font-semibold text-white">
                    {pendingAccessRequests}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {canSwitchRoles ? (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "operator" | "viewer")}
                className="vo-input hidden bg-[var(--vo-bg)] px-2 py-1.5 text-xs text-[var(--vo-muted)] md:block"
                title="Testni preklop vloge (samo UI)"
              >
                <option value="admin">admin</option>
                <option value="operator">operator</option>
                <option value="viewer">viewer</option>
              </select>
            ) : null}
            <div className="vo-user-chip ml-1 hidden sm:inline-flex" title={roleLabel(role)}>
              <span className="vo-user-avatar">{roleInitial}</span>
              <span className="pr-1">{roleLabel(role)}</span>
            </div>
            <form action="/api/portal-logout" method="post" className="ml-1">
              <button type="submit" className="vo-btn-primary hidden px-3.5 py-1.5 text-sm sm:inline-flex">
                Odjava
              </button>
            </form>
          </div>
        </header>

        <div className="border-b border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 md:hidden">
          <div className="mb-2 flex gap-2">
            <label className="vo-header-search min-w-0 flex-1">
              <Search className="h-4 w-4 shrink-0 text-[var(--vo-muted)]" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Iskanje…"
                aria-label="Iskanje"
              />
            </label>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--vo-muted)]"
            >
              ⌘K
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-0.5">
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
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    active ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "text-[var(--vo-muted)]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="vo-portal-mesh min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-5 lg:p-6">
          <div className="vo-page-content vo-page-enter">
            <PortalBreadcrumbs />
            {children}
          </div>
        </div>
      </div>
      <PortalCommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <PortalShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

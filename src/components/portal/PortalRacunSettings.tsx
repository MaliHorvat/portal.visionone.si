"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Calculator,
  ExternalLink,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePortalToast } from "@/context/PortalToastContext";
import type { NavPermissionKey } from "@/lib/nav-permissions";
import { NAV_PERMISSION_LABELS } from "@/lib/nav-permissions";
import {
  getDashboardCompact,
  getDashboardFavoritesOnly,
  getSidebarCollapsed,
  setDashboardCompact,
  setDashboardFavoritesOnly,
  setSidebarCollapsed,
} from "@/lib/portal-prefs";
import { roleLabel, type PortalUserRole } from "@/lib/portal-roles";

const SHORTCUTS = [
  { keys: "Ctrl + K", desc: "Ukazna paleta" },
  { keys: "/", desc: "Iskanje v glavi" },
  { keys: "?", desc: "Bližnjice (kjerkoli v portalu)" },
  { keys: "Esc", desc: "Zapri okna" },
];

type QuickLink = {
  href: string;
  label: string;
  icon: ElementType;
  permission?: NavPermissionKey;
};

const QUICK_LINKS: QuickLink[] = [
  { href: "/portal", label: "Nadzorna plošča", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/portal/stranke", label: "Objekti & stranke", icon: Users, permission: "clients" },
  { href: "/portal/zahtevki", label: "Zahtevki", icon: Wrench, permission: "service-requests" },
  { href: "/portal/opomniki", label: "Opomniki", icon: Bell, permission: "dashboard" },
  { href: "/portal/orodja", label: "Kalkulatorji & orodja", icon: Calculator, permission: "tools" },
  { href: "/portal/kamera-definicije", label: "RTSP definicije", icon: Video, permission: "camera-definitions" },
];

type Props = {
  username: string;
  role: PortalUserRole;
  mustChangePassword: boolean;
  navPermissions: NavPermissionKey[];
};

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--vo-border)] py-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-[var(--vo-fg)]">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-[var(--vo-muted)]">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function PortalRacunSettings({ username, role, mustChangePassword, navPermissions }: Props) {
  const { showToast } = usePortalToast();
  const { theme, setTheme, resolved } = useTheme();
  const [dashCompact, setDashCompact] = useState(false);
  const [dashFavOnly, setDashFavOnly] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDashCompact(getDashboardCompact());
    setDashFavOnly(getDashboardFavoritesOnly());
    setSidebarCollapsedState(getSidebarCollapsed());
    setMounted(true);
  }, []);

  const allowedLinks = QUICK_LINKS.filter(
    (l) => !l.permission || role === "admin" || navPermissions.includes(l.permission),
  );

  const visibleModules = navPermissions
    .filter((k) => k !== "my-account")
    .map((k) => NAV_PERMISSION_LABELS[k])
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {mustChangePassword ? (
        <p className="vo-alert-warn text-sm">
          Ob prvi prijavi morate spremeniti geslo portala — obrazec je spodaj.
        </p>
      ) : null}

      <section className="vo-tool-section">
        <h2 className="text-base font-semibold text-[var(--vo-fg)]">Pregled računa</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--vo-muted)]">Uporabniško ime</dt>
            <dd className="mt-0.5 font-mono font-medium text-[var(--vo-fg)]">{username || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--vo-muted)]">Vloga</dt>
            <dd className="mt-0.5 font-medium text-[var(--vo-fg)]">{roleLabel(role)}</dd>
          </div>
        </dl>
        {visibleModules.length > 0 ? (
          <p className="mt-4 text-xs text-[var(--vo-muted)]">
            Dostop do modulov: {visibleModules.join(" · ")}
            {navPermissions.length > 8 ? " …" : ""}
          </p>
        ) : null}
      </section>

      <section className="vo-tool-section">
        <h2 className="text-base font-semibold text-[var(--vo-fg)]">Videz portala</h2>
        <div className="mt-2 divide-y divide-[var(--vo-border)]">
          <SettingRow label="Tema" hint="Velja za cel portal na tej napravi.">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "light" as const, label: "Svetla", icon: Sun },
                  { id: "dark" as const, label: "Temna", icon: Moon },
                  { id: "system" as const, label: "Sistem", icon: LayoutDashboard },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTheme(id);
                    showToast(`Tema: ${label.toLowerCase()}.`);
                  }}
                  className={`vo-touch-btn inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${
                    theme === id
                      ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                      : "border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>
          {mounted ? (
            <>
              <SettingRow label="Kompaktna nadzorna plošča" hint="Manjši widgeti na začetni strani.">
                <label className="inline-flex min-h-[2.75rem] cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dashCompact}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setDashCompact(v);
                      setDashboardCompact(v);
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-[var(--vo-muted)]">{dashCompact ? "Vklopljeno" : "Izklopljeno"}</span>
                </label>
              </SettingRow>
              <SettingRow
                label="Nadzorna plošča — samo priljubljene"
                hint="Prikaže le stranke, ki ste jih označili z zvezdico."
              >
                <label className="inline-flex min-h-[2.75rem] cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dashFavOnly}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setDashFavOnly(v);
                      setDashboardFavoritesOnly(v);
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-[var(--vo-muted)]">{dashFavOnly ? "Vklopljeno" : "Izklopljeno"}</span>
                </label>
              </SettingRow>
              <SettingRow label="Strnjena stranska vrstica" hint="Privzeto zoženi meni ob naslednjem obisku.">
                <label className="inline-flex min-h-[2.75rem] cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sidebarCollapsed}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setSidebarCollapsedState(v);
                      setSidebarCollapsed(v);
                      showToast(v ? "Meni bo strnjen." : "Meni bo razširjen.");
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-[var(--vo-muted)]">
                    {sidebarCollapsed ? "Strnjeno" : "Razširjeno"}
                  </span>
                </label>
              </SettingRow>
            </>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-[var(--vo-muted)]">
          Trenutno aktivna tema: <strong className="text-[var(--vo-fg)]">{resolved === "dark" ? "temna" : "svetla"}</strong>
          {theme === "system" ? " (sistem)" : ""}. Osvežite stran, če nadzorna plošča ne posodobi videza takoj.
        </p>
      </section>

      <section className="vo-tool-section">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--vo-fg)]">
          <Keyboard className="h-4 w-4 text-[var(--vo-accent)]" />
          Bližnjice
        </h2>
        <ul className="mt-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <kbd className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 font-mono text-xs">
                {s.keys}
              </kbd>
              <span className="text-[var(--vo-muted)]">{s.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {allowedLinks.length > 0 ? (
        <section className="vo-tool-section">
          <h2 className="text-base font-semibold text-[var(--vo-fg)]">Hitri dostop</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {allowedLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="vo-touch-btn vo-btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="vo-tool-section">
        <h2 className="text-base font-semibold text-[var(--vo-fg)]">Varnost in seja</h2>
        <div className="mt-4 space-y-3 text-sm text-[var(--vo-muted)]">
          <p>
            Za spremembo gesla portala uporabite obrazec spodaj. Varnostna prijava (Clerk) je ločena — urejate jo v
            nastavitvah varnosti, če jo uporabljate.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="#sprememba-gesla"
              className="vo-touch-btn vo-btn-secondary inline-flex items-center gap-2 text-sm"
            >
              Skok na spremembo gesla
            </a>
            <form action="/api/portal-logout" method="post">
              <button
                type="submit"
                className="vo-touch-btn inline-flex items-center gap-2 rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm font-semibold text-[var(--vo-danger)] hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Odjava iz portala
              </button>
            </form>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-[var(--vo-muted)]">
        <a
          href="https://visionone.si"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-[var(--vo-accent)]"
        >
          visionone.si
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}

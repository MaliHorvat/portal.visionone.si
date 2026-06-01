"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  portal: "Portal",
  stranke: "Stranke",
  zahtevki: "Zahtevki",
  ponudbe: "Ponudbe",
  opomniki: "Opomniki",
  cas: "Čas",
  belezke: "Beležke",
  orodja: "Orodja",
  inventar: "Inventar",
  agents: "Agenti",
  vms: "VisionOne VMS",
  obvestila: "Obvestila",
  audit: "Audit",
  paketi: "Paketi",
  nastavitve: "Nastavitve",
  racun: "Moj račun",
  "rack-dizajner": "Rack dizajner",
  "kamera-definicije": "RTSP definicije",
  "care-box": "Care Box",
};

export function PortalBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname.startsWith("/portal")) return null;

  const parts = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const seg = parts[i];
    if (seg === "portal" && i === 0) {
      crumbs.push({ href: "/portal", label: "Nadzorna plošča" });
      continue;
    }
    const label = LABELS[seg] ?? (i === parts.length - 1 && parts[1] === "stranke" ? "Profil" : seg);
    crumbs.push({ href: acc, label });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--vo-border)]/80 bg-[var(--vo-surface)]/70 px-2.5 py-1.5 text-xs text-[var(--vo-muted)] backdrop-blur-sm"
    >
      <Link
        href="/portal"
        className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 transition hover:bg-[var(--vo-accent-muted)] hover:text-[var(--vo-accent)]"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
      </Link>
      {crumbs.slice(1).map((c, i) => (
        <span key={c.href} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-40" aria-hidden />
          {i === crumbs.length - 2 ? (
            <span className="rounded-md bg-[var(--vo-accent-muted)] px-2 py-0.5 font-semibold text-[var(--vo-accent)]">
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className="rounded-md px-1.5 py-0.5 transition hover:text-[var(--vo-accent)]">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

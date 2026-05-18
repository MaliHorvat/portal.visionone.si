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
  obvestila: "Obvestila",
  audit: "Audit",
  paketi: "Paketi",
  nastavitve: "Nastavitve",
  racun: "Moj račun",
  "rack-dizajner": "Rack dizajner",
  "kamera-definicije": "RTSP definicije",
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
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-[var(--vo-muted)]">
      <Link href="/portal" className="inline-flex items-center gap-0.5 hover:text-[var(--vo-accent)]">
        <Home className="h-3.5 w-3.5" aria-hidden />
      </Link>
      {crumbs.slice(1).map((c, i) => (
        <span key={c.href} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
          {i === crumbs.length - 2 ? (
            <span className="font-medium text-[var(--vo-fg)]">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-[var(--vo-accent)]">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

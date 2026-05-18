"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { getRecentClients } from "@/lib/portal-prefs";
import { clientProfilePath } from "@/lib/client-url";

const NAV = [
  { href: "/portal", label: "Nadzorna plošča" },
  { href: "/portal/stranke", label: "Objekti & stranke" },
  { href: "/portal/zahtevki", label: "Zahtevki" },
  { href: "/portal/opomniki", label: "Opomniki" },
  { href: "/portal/ponudbe", label: "Ponudbe" },
  { href: "/portal/cas", label: "Sledenje času" },
  { href: "/portal/belezke", label: "Beležke" },
  { href: "/portal/orodja", label: "Orodja" },
  { href: "/portal/inventar", label: "Inventar" },
  { href: "/portal/rack-dizajner", label: "Rack dizajner" },
  { href: "/portal/agents", label: "Agenti" },
  { href: "/portal/nastavitve", label: "Nastavitve" },
  { href: "/portal/racun", label: "Moj račun" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PortalCommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [apiHits, setApiHits] = useState<Array<{ id: string; label: string; href: string; meta?: string }>>([]);

  const recent = useMemo(() => getRecentClients().slice(0, 5), [open]);

  const navFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return NAV;
    return NAV.filter((n) => n.label.toLowerCase().includes(s));
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setApiHits([]);
    }
  }, [open]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setApiHits([]);
      return;
    }
    const id = window.setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(s)}`);
      if (!r.ok) return;
      const j = (await r.json()) as { items?: typeof apiHits };
      setApiHits(j.items ?? []);
    }, 200);
    return () => window.clearTimeout(id);
  }, [q]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Ukazna paleta"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--vo-border)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--vo-muted)]" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pojdi na stran, išči stranke…"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--vo-fg)] outline-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1 text-sm">
          {recent.length > 0 && !q.trim() ? (
            <li className="px-2 py-1 text-[10px] font-semibold uppercase text-[var(--vo-muted)]">Nedavno</li>
          ) : null}
          {!q.trim()
            ? recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-2 text-left hover:bg-[var(--vo-surface-2)]"
                    onClick={() => go(clientProfilePath({ id: r.id, slug: "" }))}
                  >
                    {r.name}
                  </button>
                </li>
              ))
            : null}
          {navFiltered.map((n) => (
            <li key={n.href}>
              <button
                type="button"
                className="w-full rounded px-2 py-2 text-left hover:bg-[var(--vo-surface-2)]"
                onClick={() => go(n.href)}
              >
                {n.label}
              </button>
            </li>
          ))}
          {apiHits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-2 text-left hover:bg-[var(--vo-surface-2)]"
                onClick={() => go(h.href)}
              >
                <span className="block text-[var(--vo-fg)]">{h.label}</span>
                {h.meta ? <span className="text-xs text-[var(--vo-muted)]">{h.meta}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-[var(--vo-border)] px-3 py-2 text-[10px] text-[var(--vo-muted)]">
          <kbd className="rounded border border-[var(--vo-border)] px-1">Esc</kbd> zapri ·{" "}
          <kbd className="rounded border border-[var(--vo-border)] px-1">Ctrl</kbd>+
          <kbd className="rounded border border-[var(--vo-border)] px-1">K</kbd> odpri
        </p>
      </div>
    </div>
  );
}

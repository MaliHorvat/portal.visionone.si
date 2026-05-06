"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import type { ClientSummary } from "@/lib/types";

function clientHref(c: ClientSummary, tab: string | null) {
  const base = c.slug ? `/portal/stranke/${encodeURIComponent(c.slug)}` : `/portal/stranke/${encodeURIComponent(c.id)}`;
  return tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
}

function StatusDot({ health }: { health: ClientSummary["health"] }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        health === "ok" ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"
      }`}
    />
  );
}

export function ProfileBackNav() {
  const { role } = usePortalRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const currentSlug = useMemo(() => pathname.split("/").filter(Boolean).pop() ?? "", [pathname]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    void fetch("/api/clients")
      .then((r) => r.json())
      .then((j: { clients?: ClientSummary[] }) => {
        if (cancelled) return;
        setClients(j.clients ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setClients([]);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function delClient(c: ClientSummary) {
    if (!confirm(`Izbrišem objekt/stranko "${c.name}"?`)) return;
    setBusyId(c.id);
    const res = await fetch(`/api/clients/${encodeURIComponent(c.id)}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return;
    const left = clients.filter((x) => x.id !== c.id);
    setClients(left);
    const currentIsThis = currentSlug === c.id || currentSlug === c.slug;
    if (currentIsThis) {
      const next = left[0];
      if (next) router.push(clientHref(next, tab));
      else router.push("/portal/stranke");
    } else {
      router.refresh();
    }
  }

  if (role !== "admin") {
    return (
      <Link href="/portal" className="text-xs font-medium text-[var(--vo-accent)] hover:underline">
        ← Nazaj na nadzorno ploščo
      </Link>
    );
  }

  return (
    <aside className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-2 shadow-[var(--vo-card-shadow)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[var(--vo-fg)]">Objekti</div>
          <Link href="/portal/stranke" className="text-[11px] text-[var(--vo-muted)] hover:underline">
            Upravljanje strank
          </Link>
        </div>
        <Link
          href="/portal/stranke"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2 py-1 text-xs text-[var(--vo-fg)] hover:bg-[var(--vo-surface-2)]"
          title="Dodaj objekt/stranko"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Dodaj
        </Link>
      </div>

      <div className="space-y-1">
        {clients.map((c) => {
          const active = currentSlug === c.id || (c.slug && currentSlug === c.slug);
          return (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm ${
                active ? "border-[var(--vo-border)] bg-[var(--vo-surface-2)]" : "border-[var(--vo-border)]/80"
              }`}
            >
              <Link href={clientHref(c, tab)} className="flex min-w-0 flex-1 items-center gap-2">
                <StatusDot health={c.health} />
                <span className={`truncate ${active ? "text-[var(--vo-fg)]" : "text-[var(--vo-fg)]/90"}`}>
                  {c.name}
                </span>
              </Link>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => void delClient(c)}
                className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-danger)] disabled:opacity-40"
                title="Izbriši"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
        {clients.length === 0 ? (
          <div className="rounded-lg border border-[var(--vo-border)] px-3 py-3 text-sm text-[var(--vo-muted)]">
            Ni strank.
          </div>
        ) : null}
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePortalToast } from "@/context/PortalToastContext";
import { clearPortalLocalPrefs, getRecentClients, getFavoriteClientIds } from "@/lib/portal-prefs";

export function PortalRacunExtras() {
  const { showToast } = usePortalToast();
  const recent = getRecentClients();
  const favs = getFavoriteClientIds();

  return (
    <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 text-sm shadow-[var(--vo-card-shadow)]">
      <h2 className="font-semibold text-[var(--vo-fg)]">Podatki v brskalniku</h2>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">
        Priljubljene stranke, nedavni obiski, vrstni red menija in prilagojeni hitri dostopi.
      </p>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[var(--vo-muted)]">Priljubljene</dt>
          <dd className="font-mono text-[var(--vo-fg)]">{favs.length}</dd>
        </div>
        <div>
          <dt className="text-[var(--vo-muted)]">Nedavno odprto</dt>
          <dd className="font-mono text-[var(--vo-fg)]">{recent.length}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
          onClick={() => {
            clearPortalLocalPrefs();
            showToast("Lokalne nastavitve portala so počiščene.");
          }}
        >
          Počisti lokalne nastavitve
        </button>
        <Link href="/portal" className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]">
          Nazaj na pregled
        </Link>
      </div>
    </section>
  );
}

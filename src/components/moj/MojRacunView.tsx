"use client";

import { useEffect, useState } from "react";
import type { ClientSummary } from "@/lib/types";

export function MojRacunView() {
  const [client, setClient] = useState<ClientSummary | null>(null);

  useEffect(() => {
    void fetch("/api/moj/overview", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { client?: ClientSummary }) => setClient(j.client ?? null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Račun</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">Podatki o objektu in paketu storitev.</p>
      </div>

      {client ? (
        <dl className="divide-y divide-[var(--vo-border)] rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          {[
            ["Objekt", client.name],
            ["Naslov", client.address || "—"],
            ["Paket", client.package?.name ?? "Po dogovoru"],
            ["Opis paketa", client.package?.description || "—"],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]">
              <dt className="text-xs font-bold uppercase text-[var(--vo-muted)]">{k}</dt>
              <dd className="text-sm text-[var(--vo-fg)]">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-[var(--vo-muted)]">Podatki niso na voljo.</p>
      )}

      <p className="text-xs text-[var(--vo-muted)]">
        Za spremembo paketa ali kontaktnih podatkov pišite na{" "}
        <a href="mailto:info@visionone.si" className="text-[var(--vo-accent)] hover:underline">
          info@visionone.si
        </a>
        .
      </p>
    </div>
  );
}

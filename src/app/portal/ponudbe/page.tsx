"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";
import { AdminGate } from "@/components/portal/AdminGate";
import { downloadCsv } from "@/lib/portal-export";
import { clientProfilePath } from "@/lib/client-url";

type OfferRow = {
  id: string;
  title: string;
  offerDate: string;
  clientAddress: string;
  updatedAt: string;
  client: { id: string; name: string; slug: string | null };
  lines: Array<{ qty: number; unitPrice: number; discountPct: number }>;
};

function lineNet(l: { qty: number; unitPrice: number; discountPct: number }) {
  return l.qty * l.unitPrice * (1 - l.discountPct / 100);
}

function offerGross(o: OfferRow) {
  const net = o.lines.reduce((s, l) => s + lineNet(l), 0);
  return net * 1.22;
}

function offerLabel(o: OfferRow) {
  const t = o.title?.trim();
  if (t) return t;
  if (o.offerDate) return `Ponudba ${o.offerDate}`;
  return o.id.slice(0, 8) + "…";
}

export default function PonudbePage() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/offers", { credentials: "include" });
        const j = (await r.json()) as { offers?: OfferRow[] };
        setOffers(j.offers ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) map.set(o.client.id, o.client.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "sl"));
  }, [offers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((o) => {
      if (clientFilter && o.client.id !== clientFilter) return false;
      if (!q) return true;
      return (
        offerLabel(o).toLowerCase().includes(q) ||
        o.client.name.toLowerCase().includes(q) ||
        (o.offerDate ?? "").includes(q)
      );
    });
  }, [offers, search, clientFilter]);

  return (
    <AdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Vse ponudbe</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Pregled ponudb po vseh strankah. Urejanje v profilu stranke → zavihek Ponudbe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" />
            <input
              type="search"
              placeholder="Išči po imenu ponudbe ali stranki…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
          >
            <option value="">Vse stranke</option>
            {clients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv("visionone-vse-ponudbe.csv", [
                ["Ime ponudbe", "Stranka", "Datum", "Postavk", "Ocena bruto €", "Posodobljeno"],
                ...filtered.map((o) => [
                  offerLabel(o),
                  o.client.name,
                  o.offerDate,
                  String(o.lines.length),
                  offerGross(o).toFixed(2),
                  new Date(o.updatedAt).toLocaleString("sl-SI"),
                ]),
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <span className="text-xs text-[var(--vo-muted)]">
            {loading ? "Nalaganje…" : `${filtered.length} ponudb`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Ponudba</th>
                <th className="px-4 py-3 font-medium">Stranka</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Postavke</th>
                <th className="px-4 py-3 font-medium text-right">Ocena (bruto)</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-[var(--vo-border)]">
                  <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{offerLabel(o)}</td>
                  <td className="px-4 py-3 text-[var(--vo-muted)]">{o.client.name}</td>
                  <td className="px-4 py-3">{o.offerDate || "—"}</td>
                  <td className="px-4 py-3">{o.lines.length}</td>
                  <td className="px-4 py-3 text-right">{offerGross(o).toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${clientProfilePath(o.client)}?tab=ponudbe`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--vo-accent)] hover:underline"
                    >
                      Uredi
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--vo-muted)]">
              Ni ponudb. Ustvarite jih v profilu stranke.
            </p>
          ) : null}
        </div>
      </div>
    </AdminGate>
  );
}

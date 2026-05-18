"use client";

import { useMemo, useState } from "react";

import { Copy, Download, Search, Trash2 } from "lucide-react";

import { AdminGate } from "@/components/portal/AdminGate";

import { DecimalInput } from "@/components/portal/DecimalInput";

import { exportOfferLinesCsv } from "@/lib/portal-export";

import { mockOfferLines } from "@/lib/mock-data";

import type { OfferLine } from "@/lib/types";

const VAT = 0.22;

function totals(lines: OfferLine[]) {
  let net = 0;

  for (const l of lines) {
    const lineNet = l.qty * l.unitPrice * (1 - l.discountPct / 100);

    net += lineNet;
  }

  const gross = net * (1 + VAT);

  return { net, gross };
}

export default function PonudbePage() {
  const [lines, setLines] = useState<OfferLine[]>(mockOfferLines);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return lines;

    return lines.filter(
      (l) =>
        l.code.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
  }, [lines, search]);

  const { net, gross } = useMemo(() => totals(lines), [lines]);

  function addLine() {
    setLines((prev) => [
      ...prev,

      {
        id: `l${Date.now()}`,

        code: "NOVO",

        description: "Nova postavka",

        qty: 1,

        unitPrice: 100,

        discountPct: 0,
      },
    ]);
  }

  function duplicateLine(id: string) {
    const src = lines.find((l) => l.id === id);

    if (!src) return;

    setLines((prev) => [
      ...prev,

      {
        ...src,
        id: `l${Date.now()}`,
        description: `${src.description} (kopija)`,
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<OfferLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <AdminGate>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Ponudbe</h1>

            <p className="mt-1 text-sm text-[var(--vo-muted)]">
              Postavke z DDV izračunom — shranjevanje prek Go API (še ni
              povezano).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportOfferLinesCsv(lines)}
              disabled={lines.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Izvozi CSV
            </button>

            <button
              type="button"
              onClick={addLine}
              className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
            >
              Dodaj postavko
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" />

          <input
            type="search"
            placeholder="Išči po kodi ali opisu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Koda</th>

                <th className="px-3 py-2 font-medium">Opis</th>

                <th className="px-3 py-2 font-medium">Kol.</th>

                <th className="px-3 py-2 font-medium">Cena</th>

                <th className="px-3 py-2 font-medium">Popust %</th>

                <th className="px-3 py-2 font-medium w-24" />
              </tr>
            </thead>

            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-[var(--vo-border)]">
                  <td className="px-3 py-2">
                    <input
                      value={l.code}
                      onChange={(e) =>
                        updateLine(l.id, { code: e.target.value })
                      }
                      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs hover:border-[var(--vo-border)]"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={l.description}
                      onChange={(e) =>
                        updateLine(l.id, { description: e.target.value })
                      }
                      className="w-full min-w-[200px] rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--vo-border)]"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <DecimalInput
                      value={l.qty}
                      onChange={(qty) => updateLine(l.id, { qty })}
                      className="w-16 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <DecimalInput
                      value={l.unitPrice}
                      onChange={(unitPrice) => updateLine(l.id, { unitPrice })}
                      className="w-24 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <DecimalInput
                      value={l.discountPct}
                      onChange={(discountPct) =>
                        updateLine(l.id, { discountPct })
                      }
                      className="w-16 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Podvoji"
                        onClick={() => duplicateLine(l.id)}
                        className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        title="Izbriši"
                        onClick={() => removeLine(l.id)}
                        className="rounded p-1 text-[var(--vo-danger)] hover:bg-[var(--vo-surface-2)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--vo-muted)]">
              Ni postavk za iskalni niz.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-8 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-6 py-4 text-sm">
          <div>
            <div className="text-[var(--vo-muted)]">Skupaj brez DDV</div>

            <div className="text-lg font-bold text-[var(--vo-fg)]">
              {net.toFixed(2)} €
            </div>
          </div>

          <div>
            <div className="text-[var(--vo-muted)]">Skupaj z DDV (22 %)</div>

            <div className="text-lg font-bold text-[var(--vo-accent)]">
              {gross.toFixed(2)} €
            </div>
          </div>

          <div>
            <div className="text-[var(--vo-muted)]">Postavk</div>

            <div className="text-lg font-bold text-[var(--vo-fg)]">
              {lines.length}
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}

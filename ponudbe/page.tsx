"use client";

import { useMemo, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";
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
            Postavke z DDV izračunom — shranjevanje prek Go API (še ni povezano).
          </p>
        </div>
        <button
          type="button"
          onClick={addLine}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
        >
          Dodaj postavko
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Koda</th>
              <th className="px-3 py-2 font-medium">Opis</th>
              <th className="px-3 py-2 font-medium">Kol.</th>
              <th className="px-3 py-2 font-medium">Cena</th>
              <th className="px-3 py-2 font-medium">Popust %</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-[var(--vo-border)]">
                <td className="px-3 py-2">
                  <input
                    value={l.code}
                    onChange={(e) => updateLine(l.id, { code: e.target.value })}
                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={l.description}
                    onChange={(e) => updateLine(l.id, { description: e.target.value })}
                    className="w-full min-w-[200px] rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) || 0 })}
                    className="w-16 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unitPrice}
                    onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })}
                    className="w-24 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={l.discountPct}
                    onChange={(e) => updateLine(l.id, { discountPct: Number(e.target.value) || 0 })}
                    className="w-16 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-1 py-0.5"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-8 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-6 py-4 text-sm">
        <div>
          <div className="text-[var(--vo-muted)]">Skupaj brez DDV</div>
          <div className="text-lg font-bold text-[var(--vo-fg)]">{net.toFixed(2)} €</div>
        </div>
        <div>
          <div className="text-[var(--vo-muted)]">Skupaj z DDV (22 %)</div>
          <div className="text-lg font-bold text-[var(--vo-accent)]">{gross.toFixed(2)} €</div>
        </div>
      </div>
    </div>
    </AdminGate>
  );
}

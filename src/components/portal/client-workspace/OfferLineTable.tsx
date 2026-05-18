"use client";

import { DecimalInput } from "@/components/portal/DecimalInput";

const EUR = "\u20AC";

export type OfferLineRow = {
  key: string;
  section: "material" | "service";
  code: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  lineVatPct: number;
};

function lineNet(l: OfferLineRow) {
  return l.qty * l.unitPrice * (1 - l.discountPct / 100);
}

type Props = {
  title: string;
  section: OfferLineRow["section"];
  list: OfferLineRow[];
  onUpdateRow: (key: string, patch: Partial<OfferLineRow>) => void;
  onRemoveRow: (key: string) => void;
  onAddRow: (section: OfferLineRow["section"]) => void;
};

/** Ločena komponenta — ne sme biti znotraj TabPonudbe (sicer izguba fokusa ob vsakem znaku). */
export function OfferLineTable({ title, section, list, onUpdateRow, onRemoveRow, onAddRow }: Props) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--vo-fg)]">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-[var(--vo-border)]">
        <table className="min-w-[760px] w-full text-left text-[11px]">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-2 py-1.5">ŠIFRA</th>
              <th className="px-2 py-1.5">OPIS</th>
              <th className="px-2 py-1.5">ENOTA</th>
              <th className="px-2 py-1.5">KOL.</th>
              <th className="px-2 py-1.5">CENA {EUR}</th>
              <th className="px-2 py-1.5">POPUST %</th>
              <th className="px-2 py-1.5">DDV %</th>
              <th className="px-2 py-1.5">SKUPAJ</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.key} className="border-b border-[var(--vo-border)]">
                <td className="px-2 py-1">
                  <input
                    value={l.code}
                    onChange={(e) => onUpdateRow(l.key, { code: e.target.value })}
                    className="w-full rounded border border-transparent bg-transparent hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={l.description}
                    onChange={(e) => onUpdateRow(l.key, { description: e.target.value })}
                    className="w-full min-w-[140px] rounded border border-transparent bg-transparent hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={l.unit}
                    onChange={(e) => onUpdateRow(l.key, { unit: e.target.value })}
                    className="w-14"
                  />
                </td>
                <td className="px-2 py-1">
                  <DecimalInput
                    value={l.qty}
                    onChange={(qty) => onUpdateRow(l.key, { qty })}
                    className="w-16 rounded border border-transparent bg-transparent px-1 hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <DecimalInput
                    value={l.unitPrice}
                    onChange={(unitPrice) => onUpdateRow(l.key, { unitPrice })}
                    className="w-20 rounded border border-transparent bg-transparent px-1 hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <DecimalInput
                    value={l.discountPct}
                    onChange={(discountPct) => onUpdateRow(l.key, { discountPct })}
                    className="w-14 rounded border border-transparent bg-transparent px-1 hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1">
                  <DecimalInput
                    value={l.lineVatPct}
                    onChange={(lineVatPct) => onUpdateRow(l.key, { lineVatPct })}
                    className="w-14 rounded border border-transparent bg-transparent px-1 hover:border-[var(--vo-border)]"
                  />
                </td>
                <td className="px-2 py-1 font-medium">{lineNet(l).toFixed(2)} {EUR}</td>
                <td className="px-2 py-1">
                  <button type="button" className="text-red-500 hover:underline" onClick={() => onRemoveRow(l.key)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="text-xs font-medium text-[var(--vo-accent)] hover:underline"
        onClick={() => onAddRow(section)}
      >
        + Dodaj {section === "material" ? "material" : "delo"}
      </button>
    </div>
  );
}

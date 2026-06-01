"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";
import { DecimalInput } from "@/components/portal/DecimalInput";
import { downloadCsv } from "@/lib/portal-export";

type Item = {
  id: string;
  name: string;
  model: string;
  qty: number;
  unit: string;
  unitPrice: number;
  minQty: number;
  sku: string;
  supplier: string;
  location: string;
};

const KEY = "vo_inventory_v2";

function emptyItem(): Item {
  return {
    id: "",
    name: "",
    model: "",
    qty: 0,
    unit: "kos",
    unitPrice: 0,
    minQty: 0,
    sku: "",
    supplier: "",
    location: "",
  };
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`.trim()}>
      <span className="vo-field-label">{label}</span>
      {children}
    </label>
  );
}

export default function InventarPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState<Item>(emptyItem());
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (lowOnly && row.qty > row.minQty) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.model.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q) ||
        row.supplier.toLowerCase().includes(q)
      );
    });
  }, [items, search, lowOnly]);

  const stockValue = useMemo(
    () => items.reduce((sum, row) => sum + row.qty * row.unitPrice, 0),
    [items],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Item[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return;
    if (editId) {
      setItems((prev) => prev.map((x) => (x.id === editId ? { ...f, id: editId } : x)));
    } else {
      setItems((prev) => [{ ...f, id: crypto.randomUUID() }, ...prev]);
    }
    setF(emptyItem());
    setEditId(null);
  }

  function cancelEdit() {
    setF(emptyItem());
    setEditId(null);
  }

  return (
    <AdminGate>
      <div className="space-y-6 pb-[env(safe-area-inset-bottom)]">
        <div>
          <h1 className="vo-page-title text-xl sm:text-2xl">Inventar</h1>
          <p className="vo-page-desc mt-1 text-sm">
            Urejanje zalog: ime, model, količina, cena, enota, minimum, dobavitelj in lokacija.
          </p>
        </div>

        <form
          onSubmit={saveItem}
          className="vo-tool-section grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field label="Ime artikla *">
            <input
              placeholder="npr. IP kamera 4MP"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              className="vo-input vo-input-touch w-full"
              required
            />
          </Field>
          <Field label="Model">
            <input
              placeholder="npr. DS-2CD2143G2"
              value={f.model}
              onChange={(e) => setF({ ...f, model: e.target.value })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="SKU">
            <input
              placeholder="šifra artikla"
              value={f.sku}
              onChange={(e) => setF({ ...f, sku: e.target.value })}
              className="vo-input vo-input-touch w-full font-mono"
            />
          </Field>
          <Field label="Količina na zalogi">
            <DecimalInput
              placeholder="npr. 12"
              value={f.qty}
              onChange={(qty) => setF({ ...f, qty })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="Cena / enoto (€)">
            <DecimalInput
              placeholder="npr. 89,50"
              value={f.unitPrice}
              onChange={(unitPrice) => setF({ ...f, unitPrice })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="Enota">
            <input
              placeholder="kos, m, komplet …"
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="Minimum (opozorilo)">
            <DecimalInput
              placeholder="npr. 2"
              value={f.minQty}
              onChange={(minQty) => setF({ ...f, minQty })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="Dobavitelj">
            <input
              placeholder="ime dobavitelja"
              value={f.supplier}
              onChange={(e) => setF({ ...f, supplier: e.target.value })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <Field label="Lokacija v skladišču">
            <input
              placeholder="npr. Polica A3"
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
              className="vo-input vo-input-touch w-full"
            />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3 sm:flex-row">
            <button type="submit" className="vo-touch-btn vo-btn-primary flex-1 px-4 py-2.5 text-sm font-semibold">
              {editId ? "Shrani spremembe" : "Dodaj artikel"}
            </button>
            {editId ? (
              <button type="button" onClick={cancelEdit} className="vo-touch-btn vo-btn-secondary px-4 py-2.5 text-sm">
                Prekliči
              </button>
            ) : null}
          </div>
        </form>

        <div className="vo-tool-section flex flex-wrap items-center gap-2 text-sm">
          <input
            type="search"
            placeholder="Išči artikel…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="vo-input vo-input-touch min-w-0 flex-1"
          />
          <label className="inline-flex min-h-[2.75rem] items-center gap-2 text-xs text-[var(--vo-muted)]">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="h-4 w-4" />
            Samo nizka zaloga
          </label>
          <button
            type="button"
            className="vo-touch-btn vo-btn-secondary px-3 py-2 text-xs"
            onClick={() =>
              downloadCsv("inventar.csv", [
                ["Ime", "Model", "SKU", "Količina", "Enota", "Cena", "Minimum", "Dobavitelj", "Lokacija"],
                ...visibleItems.map((row) => [
                  row.name,
                  row.model,
                  row.sku,
                  String(row.qty),
                  row.unit,
                  String(row.unitPrice),
                  String(row.minQty),
                  row.supplier,
                  row.location,
                ]),
              ])
            }
          >
            Izvozi CSV
          </button>
          <span className="w-full text-xs text-[var(--vo-muted)] sm:w-auto">
            Vrednost zaloge: <strong className="text-[var(--vo-fg)]">{stockValue.toFixed(2)} €</strong>
          </span>
        </div>

        <div className="space-y-3 md:hidden">
          {visibleItems.map((row) => {
            const low = row.qty <= row.minQty;
            return (
              <article key={row.id} className="vo-mobile-card text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-[var(--vo-fg)]">{row.name}</p>
                  {low ? (
                    <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-semibold text-red-400">
                      LOW
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[var(--vo-muted)]">{row.model || "—"} · {row.sku || "—"}</p>
                <p className="mt-2">
                  <span className="font-semibold">{row.qty}</span> {row.unit} × {row.unitPrice.toFixed(2)} € ={" "}
                  <span className="font-semibold">{(row.qty * row.unitPrice).toFixed(2)} €</span>
                </p>
                <p className="text-xs text-[var(--vo-muted)]">
                  Min. {row.minQty} · {row.supplier || "—"} · {row.location || "—"}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="text-[var(--vo-accent)] hover:underline"
                    onClick={() => {
                      setEditId(row.id);
                      setF(row);
                    }}
                  >
                    Uredi
                  </button>
                  <button
                    type="button"
                    className="text-[var(--vo-danger)] hover:underline"
                    onClick={() => setItems((p) => p.filter((x) => x.id !== row.id))}
                  >
                    Izbriši
                  </button>
                </div>
              </article>
            );
          })}
          {visibleItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--vo-muted)]">Ni artiklov.</p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)] md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2">Ime</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Količina</th>
                <th className="px-3 py-2">Enota</th>
                <th className="px-3 py-2">Cena</th>
                <th className="px-3 py-2">Skupaj</th>
                <th className="px-3 py-2">Minimum</th>
                <th className="px-3 py-2">Dobavitelj</th>
                <th className="px-3 py-2">Lokacija</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((row) => {
                const low = row.qty <= row.minQty;
                return (
                  <tr key={row.id} className="border-b border-[var(--vo-border)] last:border-0">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-[var(--vo-muted)]">{row.model || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.sku || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{row.qty}</td>
                    <td className="px-3 py-2">{row.unit}</td>
                    <td className="px-3 py-2">{row.unitPrice.toFixed(2)} €</td>
                    <td className="px-3 py-2">{(row.qty * row.unitPrice).toFixed(2)} €</td>
                    <td className="px-3 py-2">
                      {row.minQty}
                      {low ? (
                        <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">LOW</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row.supplier || "—"}</td>
                    <td className="px-3 py-2">{row.location || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="text-[var(--vo-accent)] hover:underline"
                        onClick={() => {
                          setEditId(row.id);
                          setF(row);
                        }}
                      >
                        Uredi
                      </button>
                      <button
                        type="button"
                        className="ml-2 text-[var(--vo-danger)] hover:underline"
                        onClick={() => setItems((p) => p.filter((x) => x.id !== row.id))}
                      >
                        Izbriši
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[var(--vo-muted)]">
                    Ni artiklov.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}

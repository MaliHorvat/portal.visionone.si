"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";
import { DecimalInput } from "@/components/portal/DecimalInput";

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

export default function InventarPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState<Item>(emptyItem());
  const [editId, setEditId] = useState<string | null>(null);

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

  return (
    <AdminGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Inventar</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">Urejanje zalog: ime, model, količina, cena, enota, minimum, dobavitelj in lokacija.</p>
        </div>

        <form onSubmit={saveItem} className="grid gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-sm md:grid-cols-3">
          <input placeholder="Ime artikla" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <input placeholder="Model" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <input placeholder="SKU" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <DecimalInput placeholder="Količina" value={f.qty} onChange={(qty) => setF({ ...f, qty })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <DecimalInput placeholder="Cena / enoto (€)" value={f.unitPrice} onChange={(unitPrice) => setF({ ...f, unitPrice })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <input placeholder="Enota (kos/m/...)" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <DecimalInput placeholder="Minimum" value={f.minQty} onChange={(minQty) => setF({ ...f, minQty })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <input placeholder="Dobavitelj" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <input placeholder="Lokacija v skladišču" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
          <button type="submit" className="rounded bg-[var(--vo-accent)] px-3 py-2 font-semibold text-white md:col-span-3">{editId ? "Shrani spremembe" : "Dodaj artikel"}</button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2">Ime</th><th className="px-3 py-2">Model</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Količina</th><th className="px-3 py-2">Enota</th><th className="px-3 py-2">Cena</th><th className="px-3 py-2">Skupaj</th><th className="px-3 py-2">Minimum</th><th className="px-3 py-2">Dobavitelj</th><th className="px-3 py-2">Lokacija</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
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
                    <td className="px-3 py-2">{row.minQty}{low ? <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">LOW</span> : null}</td>
                    <td className="px-3 py-2">{row.supplier || "—"}</td>
                    <td className="px-3 py-2">{row.location || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-[var(--vo-accent)] hover:underline" onClick={() => { setEditId(row.id); setF(row); }}>Uredi</button>
                      <button type="button" className="ml-2 text-red-500 hover:underline" onClick={() => setItems((p) => p.filter((x) => x.id !== row.id))}>Izbriši</button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-[var(--vo-muted)]">Ni artiklov.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}

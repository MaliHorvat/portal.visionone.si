"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceCtx } from "./types";

type LineRow = {
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

type OfferDto = {
  id: string;
  offerDate: string;
  clientAddress: string;
  notes: string;
  totalDiscountPct: number;
  vatEnabled: boolean;
  vatPct: number;
  lines: Array<{
    section: string;
    sortOrder: number;
    code: string;
    description: string;
    unit: string;
    qty: number;
    unitPrice: number;
    discountPct: number;
    lineVatPct: number;
  }>;
};

function lineNet(l: LineRow) {
  return l.qty * l.unitPrice * (1 - l.discountPct / 100);
}

function emptyLine(section: LineRow["section"]): LineRow {
  return {
    key: `tmp-${Date.now()}-${Math.random()}`,
    section,
    code: "",
    description: "",
    unit: "kos",
    qty: 1,
    unitPrice: 0,
    discountPct: 0,
    lineVatPct: 22,
  };
}

function dtoToRows(o: OfferDto): LineRow[] {
  return (o.lines ?? []).map((l, i) => ({
    key: `l-${i}-${l.code}`,
    section: l.section === "service" ? "service" : "material",
    code: l.code,
    description: l.description,
    unit: l.unit || "kos",
    qty: l.qty,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    lineVatPct: l.lineVatPct,
  }));
}

export function TabPonudbe({ ctx }: { ctx: WorkspaceCtx }) {
  const { client, clientId, dbConfigured } = ctx;
  const [offers, setOffers] = useState<{ id: string; updatedAt?: string }[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDto | null>(null);
  const [rows, setRows] = useState<LineRow[]>([]);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}/offers`);
    if (!r.ok) return;
    const j = await r.json();
    const list = (j.offers ?? []) as OfferDto[];
    setOffers(list.map((x) => ({ id: x.id })));
    setSel((prev) => prev ?? list[0]?.id ?? null);
  }, [clientId, dbConfigured]);

  const loadOffer = useCallback(
    async (id: string) => {
      const r = await fetch(`/api/clients/${clientId}/offers/${id}`);
      if (!r.ok) return;
      const j = await r.json();
      const o = j.offer as OfferDto;
      setDraft(o);
      setRows(dtoToRows(o));
    },
    [clientId],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (sel) void loadOffer(sel);
  }, [sel, loadOffer]);

  const totals = useMemo(() => {
    let net = rows.reduce((s, l) => s + lineNet(l), 0);
    const td = draft?.totalDiscountPct ?? 0;
    net *= 1 - td / 100;
    const vatEnabled = draft?.vatEnabled ?? true;
    const vp = draft?.vatPct ?? 22;
    const vat = vatEnabled ? net * (vp / 100) : 0;
    return { net, vat, gross: net + vat };
  }, [rows, draft]);

  async function createOffer() {
    if (!dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/offers`, { method: "POST" });
    setBusy(false);
    if (!r.ok) return;
    const j = await r.json();
    await loadList();
    setSel(j.offer.id);
  }

  async function saveOffer() {
    if (!draft || !dbConfigured || !sel) return;
    setBusy(true);
    const lines = rows.map((l, i) => ({
      section: l.section,
      sortOrder: i,
      code: l.code,
      description: l.description,
      unit: l.unit,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      lineVatPct: l.lineVatPct,
    }));
    await fetch(`/api/clients/${clientId}/offers/${sel}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        offerDate: draft.offerDate,
        clientAddress: draft.clientAddress || client.address,
        notes: draft.notes,
        totalDiscountPct: draft.totalDiscountPct,
        vatEnabled: draft.vatEnabled,
        vatPct: draft.vatPct,
        lines,
      }),
    });
    setBusy(false);
    await loadOffer(sel);
  }

  async function deleteOffer() {
    if (!sel || !confirm("Izbris ponudbe?")) return;
    setBusy(true);
    await fetch(`/api/clients/${clientId}/offers/${sel}`, { method: "DELETE" });
    setBusy(false);
    setSel(null);
    setDraft(null);
    setRows([]);
    await loadList();
  }

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function LineTable({
    title,
    section,
    list,
  }: {
    title: string;
    section: LineRow["section"];
    list: LineRow[];
  }) {
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
                <th className="px-2 py-1.5">CENA €</th>
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
                    <input value={l.code} onChange={(e) => updateRow(l.key, { code: e.target.value })} className="w-full rounded border border-transparent bg-transparent hover:border-[var(--vo-border)]" />
                  </td>
                  <td className="px-2 py-1">
                    <input value={l.description} onChange={(e) => updateRow(l.key, { description: e.target.value })} className="w-full min-w-[140px] rounded border border-transparent bg-transparent hover:border-[var(--vo-border)]" />
                  </td>
                  <td className="px-2 py-1">
                    <input value={l.unit} onChange={(e) => updateRow(l.key, { unit: e.target.value })} className="w-14" />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" value={l.qty} onChange={(e) => updateRow(l.key, { qty: Number(e.target.value) || 0 })} className="w-16" />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" step="0.01" value={l.unitPrice} onChange={(e) => updateRow(l.key, { unitPrice: Number(e.target.value) || 0 })} className="w-20" />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" value={l.discountPct} onChange={(e) => updateRow(l.key, { discountPct: Number(e.target.value) || 0 })} className="w-14" />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" value={l.lineVatPct} onChange={(e) => updateRow(l.key, { lineVatPct: Number(e.target.value) || 0 })} className="w-14" />
                  </td>
                  <td className="px-2 py-1 font-medium">{lineNet(l).toFixed(2)} €</td>
                  <td className="px-2 py-1">
                    <button type="button" className="text-red-500 hover:underline" onClick={() => setRows((r) => r.filter((x) => x.key !== l.key))}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[var(--vo-accent)] hover:underline"
          onClick={() => setRows((r) => [...r, emptyLine(section)])}
        >
          + Dodaj {section === "material" ? "material" : "delo"}
        </button>
      </div>
    );
  }

  const materials = rows.filter((r) => r.section === "material");
  const services = rows.filter((r) => r.section === "service");

  return (
    <div className="space-y-6">
      {!dbConfigured ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm">Ponudbe zahtevajo bazo.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sel ?? ""}
          onChange={(e) => setSel(e.target.value || null)}
          className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-sm"
        >
          <option value="">— izberi ponudbo —</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id.slice(0, 8)}…
            </option>
          ))}
        </select>
        <button type="button" disabled={busy || !dbConfigured} onClick={() => void createOffer()} className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          Nova ponudba
        </button>
        <button type="button" disabled={busy || !sel || !dbConfigured} onClick={() => void saveOffer()} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40">
          Shrani
        </button>
        <button type="button" disabled={!sel || !dbConfigured} onClick={() => void deleteOffer()} className="text-xs text-red-500 hover:underline disabled:opacity-40">
          Izbriši
        </button>
      </div>

      {draft ? (
        <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
          <h3 className="text-lg font-semibold text-[var(--vo-fg)]">Urejanje ponudbe</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">Stranka</span>
              <input readOnly value={client.name} className="mt-1 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-1.5" />
            </label>
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">Datum</span>
              <input
                value={draft.offerDate}
                onChange={(e) => setDraft({ ...draft, offerDate: e.target.value })}
                className="mt-1 w-full rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5"
              />
            </label>
            <label className="text-xs md:col-span-2">
              <span className="text-[var(--vo-muted)]">Naslov stranke</span>
              <input
                value={draft.clientAddress}
                onChange={(e) => setDraft({ ...draft, clientAddress: e.target.value })}
                placeholder="Ulica, Pošta, Kraj"
                className="mt-1 w-full rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5"
              />
            </label>
          </div>

          <LineTable title="Material" section="material" list={materials} />
          <LineTable title="Storitve / delo" section="service" list={services} />

          <div className="flex flex-wrap justify-end gap-6 border-t border-[var(--vo-border)] pt-4 text-sm">
            <label className="flex flex-col text-xs">
              Skupni popust %
              <input
                type="number"
                value={draft.totalDiscountPct}
                onChange={(e) => setDraft({ ...draft, totalDiscountPct: Number(e.target.value) || 0 })}
                className="mt-1 w-24 rounded border border-[var(--vo-border)] px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={draft.vatEnabled} onChange={(e) => setDraft({ ...draft, vatEnabled: e.target.checked })} />
              DDV {draft.vatPct}%
            </label>
            <input
              type="number"
              value={draft.vatPct}
              onChange={(e) => setDraft({ ...draft, vatPct: Number(e.target.value) || 0 })}
              className="w-16 rounded border px-2 py-1 text-xs"
            />
            <div>
              <div className="text-[var(--vo-muted)]">Osnova</div>
              <div className="font-bold">{totals.net.toFixed(2)} €</div>
            </div>
            <div>
              <div className="text-[var(--vo-muted)]">DDV</div>
              <div className="font-bold">{totals.vat.toFixed(2)} €</div>
            </div>
            <div>
              <div className="text-[var(--vo-muted)]">Skupaj</div>
              <div className="text-lg font-bold text-[var(--vo-accent)]">{totals.gross.toFixed(2)} €</div>
            </div>
          </div>

          <label className="block text-xs">
            <span className="text-[var(--vo-muted)]">Opombe</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded border border-[var(--vo-border)] bg-transparent px-2 py-2"
              placeholder="Pogoji ponudbe…"
            />
          </label>
        </div>
      ) : (
        <p className="text-sm text-[var(--vo-muted)]">Ustvarite ponudbo ali izberite obstoječo.</p>
      )}
    </div>
  );
}

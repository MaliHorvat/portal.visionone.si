"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import { usePortalToast } from "@/context/PortalToastContext";
import { DecimalInput } from "@/components/portal/DecimalInput";
import { exportOfferLinesCsv } from "@/lib/portal-export";
import { OfferLineTable, type OfferLineRow } from "./OfferLineTable";
import type { WorkspaceCtx } from "./types";

/** ASCII-safe ù datoteka ne sme pokvariti znaka ù ob shranjevanju */
const EUR = "\u20AC";

type LineRow = OfferLineRow;

const OFFER_STATUS_LABEL: Record<string, string> = {
  draft: "Osnutek",
  sent: "Poslano",
  accepted: "Sprejeto",
  rejected: "Zavrnjeno",
};

type OfferDto = {
  id: string;
  title?: string;
  offerNumber?: string;
  offerStatus?: string;
  offerDate: string;
  clientAddress: string;
  notes: string;
  totalDiscountPct: number;
  vatEnabled: boolean;
  vatPct: number;
  createdAt?: string;
  updatedAt?: string;
  lines: Array<{
    id?: string;
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
    key: l.id ?? `tmp-load-${i}`,
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

function formatOfferPlainText(
  clientName: string,
  draft: OfferDto,
  rows: LineRow[],
  totals: { net: number; vat: number; gross: number },
): string {
  const titleLine = draft.title?.trim() ? `Naslov ponudbe: ${draft.title}` : "";
  const hdr = [`PONUDBA`, titleLine, `Stranka: ${clientName}`, `Datum: ${draft.offerDate}`, `Naslov: ${draft.clientAddress}`, ""]
    .filter(Boolean)
    .join("\n");
  const lines = rows.map(
    (l) =>
      `${l.section === "material" ? "[MAT]" : "[DEL]"} ${l.code}\t${l.description}\t${l.qty} ${l.unit} \u00D7 ${l.unitPrice} ${EUR} (popust ${l.discountPct}%) => ${lineNet(l).toFixed(2)} ${EUR}`,
  );
  const tail = [
    "",
    `Skupni popust dokumenta: ${draft.totalDiscountPct}%`,
    `DDV: ${draft.vatEnabled ? `${draft.vatPct}%` : "izklopljen"}`,
    `Osnova: ${totals.net.toFixed(2)} ${EUR}`,
    `DDV znesek: ${totals.vat.toFixed(2)} ${EUR}`,
    `SKUPAJ: ${totals.gross.toFixed(2)} ${EUR}`,
    "",
    draft.notes ? `Opombe:\n${draft.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `${hdr}\n${lines.join("\n")}\n${tail}`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function TabPonudbe({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured } = ctx;
  const [offers, setOffers] = useState<
    { id: string; title?: string; offerNumber?: string; offerStatus?: string; offerDate?: string; updatedAt?: string }[]
  >([]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDto | null>(null);
  const [rows, setRows] = useState<LineRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const savedSnapshot = useRef("");

  const loadList = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}/offers`);
    if (!r.ok) return;
    const j = await r.json();
    const list = (j.offers ?? []) as OfferDto[];
    setOffers(
      list.map((x) => ({
        id: x.id,
        title: x.title,
        offerNumber: x.offerNumber,
        offerStatus: x.offerStatus,
        offerDate: x.offerDate,
        updatedAt: x.updatedAt,
      })),
    );
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
      savedSnapshot.current = JSON.stringify({ draft: o, rows: dtoToRows(o) });
    },
    [clientId],
  );

  const isDirty = useMemo(() => {
    if (!draft) return false;
    return savedSnapshot.current !== JSON.stringify({ draft, rows });
  }, [draft, rows]);

  function offerLabel(o: {
    id: string;
    title?: string;
    offerNumber?: string;
    offerStatus?: string;
    offerDate?: string;
  }) {
    const num = o.offerNumber?.trim();
    const st = o.offerStatus ? OFFER_STATUS_LABEL[o.offerStatus] ?? o.offerStatus : "";
    const t = o.title?.trim();
    const base = num || t || (o.offerDate ? `Ponudba ${o.offerDate}` : o.id.slice(0, 8) + "ù");
    return st ? `${base} (${st})` : base;
  }

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!dbConfigured) return;
    void fetch("/api/offer-templates", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { templates?: Array<{ id: string; name: string }> }) => {
        setTemplates((j.templates ?? []).map((t) => ({ id: t.id, name: t.name })));
      })
      .catch(() => setTemplates([]));
  }, [dbConfigured]);

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
    const r = await fetch(`/api/clients/${clientId}/offers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: newOfferTitle.trim() || undefined,
        templateId: templateId || undefined,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Ustvarjanje ponudbe ni uspelo.", "err");
      return;
    }
    const j = await r.json();
    await loadList();
    setSel(j.offer.id);
    setNewOfferTitle("");
    showToast("Nova ponudba ustvarjena.");
  }

  async function duplicateCurrentOffer() {
    if (!sel || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/offers/${sel}/duplicate`, { method: "POST" });
    setBusy(false);
    if (!r.ok) {
      showToast("Podvajanje ni uspelo.", "err");
      return;
    }
    const j = await r.json();
    await loadList();
    setSel(j.offer.id);
    showToast("Ponudba podvojena.");
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
    const r = await fetch(`/api/clients/${clientId}/offers/${sel}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: draft.title ?? "",
        offerDate: draft.offerDate,
        clientAddress: draft.clientAddress || client.address,
        notes: draft.notes,
        totalDiscountPct: draft.totalDiscountPct,
        vatEnabled: draft.vatEnabled,
        vatPct: draft.vatPct,
        offerStatus: draft.offerStatus,
        offerNumber: draft.offerNumber ?? "",
        lines,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Shranjevanje ponudbe ni uspelo.", "err");
      return;
    }
    await loadOffer(sel);
    showToast("Ponudba shranjena.");
  }

  async function deleteOffer() {
    if (!sel || !confirm("Izbris ponudbe?")) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/offers/${sel}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) {
      showToast("Brisanje ponudbe ni uspelo.", "err");
      return;
    }
    setSel(null);
    setDraft(null);
    setRows([]);
    await loadList();
    showToast("Ponudba izbrisana.");
  }

  async function copyOfferText() {
    if (!draft) return;
    try {
      const text = formatOfferPlainText(client.name, draft, rows, totals);
      await navigator.clipboard.writeText(text);
      showToast("Ponudba kopirana v odlo\u017Ei\u0161\u010De.");
    } catch {
      showToast("Kopiranje v odlo\u017Ei\u0161\u010De ni uspelo.", "err");
    }
  }

  function openPreview() {
    if (!draft) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!w) return;
    const head = `
      <meta charset="utf-8" />
      <title>Ponudba</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 12px}
        .meta{font-size:12px;color:#333;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;margin:10px 0 18px}
        th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px;vertical-align:top}
        th{background:#f5f5f5;text-align:left}
        .right{text-align:right}
        .sum{margin-top:8px;display:flex;justify-content:flex-end;gap:24px;font-size:12px}
        .sum b{font-size:14px}
        pre{white-space:pre-wrap;font-size:12px;background:#fafafa;border:1px solid #eee;padding:10px}
      </style>
    `;
    const mat = rows.filter((r) => r.section === "material");
    const svc = rows.filter((r) => r.section === "service");
    function table(title: string, list: LineRow[]) {
      const body = list
        .map(
          (l) => `
            <tr>
              <td>${escapeHtml(l.code)}</td>
              <td>${escapeHtml(l.description)}</td>
              <td>${escapeHtml(l.unit)}</td>
              <td class="right">${l.qty}</td>
              <td class="right">${l.unitPrice.toFixed(2)} ${EUR}</td>
              <td class="right">${l.discountPct}%</td>
              <td class="right">${l.lineVatPct}%</td>
              <td class="right">${lineNet(l).toFixed(2)} ${EUR}</td>
            </tr>`,
        )
        .join("");
      return `
        <h2 style="font-size:13px;margin:14px 0 6px">${escapeHtml(title)}</h2>
        <table>
          <thead>
            <tr>
              <th>ùIFRA</th>
              <th>OPIS</th>
              <th>ENOTA</th>
              <th class="right">KOL.</th>
              <th class="right">CENA</th>
              <th class="right">POPUST</th>
              <th class="right">DDV</th>
              <th class="right">SKUPAJ</th>
            </tr>
          </thead>
          <tbody>${body || `<tr><td colspan="8" style="color:#666">\u2014</td></tr>`}</tbody>
        </table>
      `;
    }
    const html = `
      <!doctype html><html><head>${head}</head><body>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <img src="/visionone-mark.png" alt="" style="height:34px;width:34px;object-fit:contain" />
          <img src="/visionone-wordmark.png" alt="" style="height:18px;object-fit:contain" />
        </div>
        <h1>${escapeHtml(draft.title?.trim() || "Ponudba")}</h1>
        <div class="meta">
          <div><b>Stranka:</b> ${escapeHtml(client.name)}</div>
          <div><b>Datum:</b> ${escapeHtml(draft.offerDate || "ù")}</div>
          <div><b>Naslov:</b> ${escapeHtml(draft.clientAddress || "ù")}</div>
        </div>
        ${table("Material", mat)}
        ${table("Storitve / delo", svc)}
        <div class="sum">
          <div>Osnova<br/><b>${totals.net.toFixed(2)} ${EUR}</b></div>
          <div>DDV<br/><b>${totals.vat.toFixed(2)} ${EUR}</b></div>
          <div>Skupaj<br/><b>${totals.gross.toFixed(2)} ${EUR}</b></div>
        </div>
        ${draft.notes ? `<h2 style="font-size:13px;margin:18px 0 6px">Opombe</h2><pre>${escapeHtml(draft.notes)}</pre>` : ""}
        <script>window.focus();</script>
      </body></html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  async function exportOfferPdf() {
    if (!draft || !sel) return;
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableMod.default;
      const doc = new jsPDF();
      const [markData, wordmarkData] = await Promise.all([
        imageToDataUrl("/visionone-mark.png"),
        imageToDataUrl("/visionone-wordmark.png"),
      ]);
      if (markData) doc.addImage(markData, "PNG", 14, 8, 12, 12);
      if (wordmarkData) doc.addImage(wordmarkData, "PNG", 28, 9.5, 44, 9);
      doc.setFontSize(14);
      doc.text(draft.title?.trim() || "Ponudba", 14, 26);
      doc.setFontSize(10);
      let y = 34;
      doc.text(`Stranka: ${client.name}`, 14, y);
      y += 6;
      doc.text(`Datum: ${draft.offerDate}`, 14, y);
      y += 6;
      doc.text(`Naslov: ${draft.clientAddress}`, 14, y);
      y += 8;
      const body = rows.map((l) => [
        l.section === "material" ? "Mat." : "Delo",
        l.code,
        l.description,
        l.unit,
        String(l.qty),
        l.unitPrice.toFixed(2),
        String(l.discountPct),
        lineNet(l).toFixed(2),
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Tip", "ùifra", "Opis", "Enota", "Kol.", `Cena ${EUR}`, "Popust %", `Neto ${EUR}`]],
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [45, 45, 48] },
      });
      const docExt = doc as unknown as { lastAutoTable?: { finalY: number } };
      const finalY = docExt.lastAutoTable?.finalY ?? y + 40;
      doc.text(`Skupni popust dokumenta: ${draft.totalDiscountPct}%`, 14, finalY + 8);
      doc.text(`DDV: ${draft.vatEnabled ? `${draft.vatPct}%` : "izklopljen"}`, 14, finalY + 14);
      doc.text(`Osnova: ${totals.net.toFixed(2)} ${EUR}`, 14, finalY + 20);
      doc.text(`DDV: ${totals.vat.toFixed(2)} ${EUR}`, 14, finalY + 26);
      doc.setFont("helvetica", "bold");
      doc.text(`SKUPAJ: ${totals.gross.toFixed(2)} ${EUR}`, 14, finalY + 34);
      if (draft.notes) {
        doc.setFont("helvetica", "normal");
        doc.text("Opombe:", 14, finalY + 44);
        const split = doc.splitTextToSize(draft.notes, 180);
        doc.text(split, 14, finalY + 50);
      }
      doc.save(`ponudba-${sel.slice(0, 8)}.pdf`);
      showToast("PDF ponudbe izvoùen.");
    } catch {
      showToast("Izvoz PDF ni uspel.", "err");
    }
  }

  const updateRow = useCallback((key: string, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((r) => r.filter((x) => x.key !== key));
  }, []);

  const addRow = useCallback((section: LineRow["section"]) => {
    setRows((r) => [...r, emptyLine(section)]);
  }, []);


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
          onChange={(e) => {
            if (isDirty && !confirm("Imate neshranjene spremembe. Nadaljujem?")) return;
            setSel(e.target.value || null);
          }}
          className="max-w-[min(100%,280px)] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-sm"
        >
          <option value="">ù izberi ponudbo ù</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {offerLabel(o)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newOfferTitle}
          onChange={(e) => setNewOfferTitle(e.target.value)}
          placeholder="Ime nove ponudbe (opcijsko)"
          className="min-w-[160px] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-xs"
        />
        {templates.length > 0 ? (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="max-w-[200px] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-xs"
          >
            <option value="">ù brez predloge ù</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" disabled={busy || !dbConfigured} onClick={() => void createOffer()} className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          Nova ponudba
        </button>
        <button
          type="button"
          disabled={!sel || busy || !dbConfigured}
          onClick={() => void duplicateCurrentOffer()}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5" />
          Podvoji
        </button>
        {isDirty ? (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            Neshranjeno
          </span>
        ) : null}
        <button
          type="button"
          disabled={!draft || busy}
          onClick={() => openPreview()}
          className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Predogled
        </button>
        <button
          type="button"
          disabled={!draft || busy}
          onClick={() => void copyOfferText()}
          className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Kopiraj
        </button>
        <button
          type="button"
          disabled={!draft || busy}
          onClick={() => void exportOfferPdf()}
          className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          PDF
        </button>
        <button
          type="button"
          disabled={!draft || rows.length === 0}
          onClick={() =>
            exportOfferLinesCsv(
              rows.map((l) => ({
                code: l.code,
                description: l.description,
                qty: l.qty,
                unitPrice: l.unitPrice,
                discountPct: l.discountPct,
              })),
            )
          }
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button type="button" disabled={busy || !sel || !dbConfigured} onClick={() => void saveOffer()} className="ml-auto rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          Shrani
        </button>
        <button type="button" disabled={!sel || !dbConfigured} onClick={() => void deleteOffer()} className="text-xs text-red-500 hover:underline disabled:opacity-40">
          Izbriùi
        </button>
      </div>

      {draft ? (
        <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
          <h3 className="text-lg font-semibold text-[var(--vo-fg)]">
            {draft.title?.trim() || "Urejanje ponudbe"}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs md:col-span-2">
              <span className="text-[var(--vo-muted)]">Ime / naslov ponudbe</span>
              <input
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="npr. Ponudba video nadzor 2026"
                className="mt-1 w-full vo-select px-2 py-1 text-xs.5 font-medium"
              />
            </label>
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">Stranka</span>
              <input readOnly value={client.name} className="mt-1 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-1.5" />
            </label>
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">Datum</span>
              <input
                value={draft.offerDate}
                onChange={(e) => setDraft({ ...draft, offerDate: e.target.value })}
                className="mt-1 w-full vo-select px-2 py-1 text-xs.5"
              />
            </label>
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">ùtevilka ponudbe</span>
              <input
                value={draft.offerNumber ?? ""}
                onChange={(e) => setDraft({ ...draft, offerNumber: e.target.value })}
                placeholder="npr. PON-2026-001"
                className="mt-1 w-full vo-select px-2 py-1 text-xs.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-[var(--vo-muted)]">Status</span>
              <select
                value={draft.offerStatus ?? "draft"}
                onChange={(e) => setDraft({ ...draft, offerStatus: e.target.value })}
                className="mt-1 w-full vo-select px-2 py-1 text-xs.5"
              >
                {Object.entries(OFFER_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs md:col-span-2">
              <span className="text-[var(--vo-muted)]">Naslov stranke</span>
              <input
                value={draft.clientAddress}
                onChange={(e) => setDraft({ ...draft, clientAddress: e.target.value })}
                placeholder="Ulica, Poùta, Kraj"
                className="mt-1 w-full vo-select px-2 py-1 text-xs.5"
              />
            </label>
          </div>

          <OfferLineTable title="Material" section="material" list={materials} onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow} />
          <OfferLineTable title="Storitve / delo" section="service" list={services} onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow} />

          <div className="flex flex-wrap justify-end gap-6 border-t border-[var(--vo-border)] pt-4 text-sm">
            <label className="flex flex-col text-xs">
              Skupni popust %
              <DecimalInput
                placeholder="npr. 5"
                value={draft.totalDiscountPct}
                onChange={(totalDiscountPct) => setDraft({ ...draft, totalDiscountPct })}
                className="vo-input mt-1 w-24 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={draft.vatEnabled} onChange={(e) => setDraft({ ...draft, vatEnabled: e.target.checked })} />
              DDV {draft.vatPct}%
            </label>
            <DecimalInput
              placeholder="22"
              value={draft.vatPct}
              onChange={(vatPct) => setDraft({ ...draft, vatPct })}
              className="vo-input w-16 px-2 py-1 text-xs"
            />
            <div>
              <div className="text-[var(--vo-muted)]">Osnova</div>
              <div className="font-bold">{totals.net.toFixed(2)} {EUR}</div>
            </div>
            <div>
              <div className="text-[var(--vo-muted)]">DDV</div>
              <div className="font-bold">{totals.vat.toFixed(2)} {EUR}</div>
            </div>
            <div>
              <div className="text-[var(--vo-muted)]">Skupaj</div>
              <div className="text-lg font-bold text-[var(--vo-accent)]">{totals.gross.toFixed(2)} {EUR}</div>
            </div>
          </div>

          <label className="block text-xs">
            <span className="text-[var(--vo-muted)]">Opombe</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded border border-[var(--vo-border)] bg-transparent px-2 py-2"
              placeholder="Pogoji ponudbeù"
            />
          </label>
        </div>
      ) : (
        <p className="text-sm text-[var(--vo-muted)]">Ustvarite ponudbo ali izberite obstojeùo.</p>
      )}
    </div>
  );
}

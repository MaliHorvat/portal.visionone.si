"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

type Survey = {
  id: string;
  surveyDate: string;
  objectType: string;
  address: string;
  ceilingHeight: string;
  cabling: string;
  powerSupply: string;
  lighting: string;
  notes: string;
};

function surveyText(clientName: string, s: Survey) {
  const parts = [
    "POPIS STANJA",
    `Stranka: ${clientName}`,
    `Datum: ${s.surveyDate || "—"}`,
    `Tip objekta: ${s.objectType || "—"}`,
    `Naslov: ${s.address || "—"}`,
    `Višina stropa: ${s.ceilingHeight || "—"}`,
    `Kabli: ${s.cabling || "—"}`,
    `Napajanje: ${s.powerSupply || "—"}`,
    `Osvetlitev: ${s.lighting || "—"}`,
    "",
    s.notes ? `Opombe:\n${s.notes}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

export function TabPopisi({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured, client } = ctx;
  const [list, setList] = useState<Survey[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Survey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}/surveys`);
    if (!r.ok) return;
    const j = await r.json();
    const rows = (j.surveys ?? []) as Survey[];
    setList(rows);
    setSel((prev) => prev ?? rows[0]?.id ?? null);
  }, [clientId, dbConfigured]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const row = list.find((x) => x.id === sel);
    if (row) {
      const address = row.address || client.address || "";
      setForm({ ...row, address });
    }
    else setForm(null);
  }, [sel, list, client.address]);

  async function create() {
    if (!dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/surveys`, { method: "POST" });
    setBusy(false);
    if (!r.ok) {
      showToast("Ustvarjanje popisa ni uspelo.", "err");
      return;
    }
    await load();
    showToast("Nov popis ustvarjen.");
  }

  async function save() {
    if (!form || !sel || !dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/surveys/${sel}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Shranjevanje popisa ni uspelo.", "err");
      return;
    }
    await load();
    showToast("Popis shranjen.");
  }

  async function copy() {
    if (!form) return;
    try {
      await navigator.clipboard.writeText(surveyText(client.name, form));
      showToast("Popis kopiran v odložišče.");
    } catch {
      showToast("Kopiranje ni uspelo.", "err");
    }
  }

  async function pdf() {
    if (!form) return;
    try {
      const [{ jsPDF }] = await Promise.all([import("jspdf")]);
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text("Popis stanja", 14, 18);
      doc.setFontSize(10);
      let y = 28;
      const rows: Array<[string, string]> = [
        ["Stranka", client.name],
        ["Datum", form.surveyDate || "—"],
        ["Tip objekta", form.objectType || "—"],
        ["Naslov", form.address || "—"],
        ["Višina stropa", form.ceilingHeight || "—"],
        ["Kabli", form.cabling || "—"],
        ["Napajanje", form.powerSupply || "—"],
        ["Osvetlitev", form.lighting || "—"],
      ];
      for (const [k, v] of rows) {
        doc.setFont("helvetica", "bold");
        doc.text(`${k}:`, 14, y);
        doc.setFont("helvetica", "normal");
        const split = doc.splitTextToSize(v, 160);
        doc.text(split, 46, y);
        y += 6 + Math.max(0, (split.length - 1) * 4);
      }
      if (form.notes) {
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.text("Opombe:", 14, y);
        doc.setFont("helvetica", "normal");
        const split = doc.splitTextToSize(form.notes, 180);
        doc.text(split, 14, y + 6);
      }
      doc.save(`popis-${form.id.slice(0, 8)}.pdf`);
      showToast("PDF izvožen.");
    } catch {
      showToast("Izvoz PDF ni uspel.", "err");
    }
  }

  async function remove() {
    if (!sel || !confirm("Izbris popisa?")) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${clientId}/surveys/${sel}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) {
      showToast("Brisanje popisa ni uspelo.", "err");
      return;
    }
    setSel(null);
    await load();
    showToast("Popis izbrisan.");
  }

  return (
    <div className="space-y-4">
      {!dbConfigured ? <p className="text-sm text-amber-200">Zahtevana je baza.</p> : null}
      <div className="flex flex-wrap gap-2">
        <select value={sel ?? ""} onChange={(e) => setSel(e.target.value || null)} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-sm">
          <option value="">— izberi —</option>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              {s.surveyDate || s.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <button type="button" disabled={busy || !dbConfigured} onClick={() => void create()} className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
          Nov popis
        </button>
        <button type="button" disabled={busy || !sel || !dbConfigured} onClick={() => void save()} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs disabled:opacity-40">
          Shrani
        </button>
        <button type="button" disabled={!form} onClick={() => void copy()} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs disabled:opacity-40">
          Kopiraj
        </button>
        <button type="button" disabled={!form} onClick={() => void pdf()} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-xs disabled:opacity-40">
          PDF
        </button>
        <button type="button" disabled={!sel || !dbConfigured} onClick={() => void remove()} className="text-xs text-red-500 hover:underline disabled:opacity-40">
          Izbriši
        </button>
      </div>

      {form ? (
        <div className="grid gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 md:grid-cols-2">
          <h3 className="text-lg font-semibold text-[var(--vo-fg)] md:col-span-2">Popis stanja</h3>
          <label className="text-xs">
            Stranka
            <input readOnly value={client.name} className="mt-1 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-1.5" />
          </label>
          <label className="text-xs">
            Datum
            <input value={form.surveyDate} onChange={(e) => setForm({ ...form, surveyDate: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs">
            Tip objekta
            <input value={form.objectType} onChange={(e) => setForm({ ...form, objectType: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs md:col-span-2">
            Naslov
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs">
            Višina stropa
            <input value={form.ceilingHeight} onChange={(e) => setForm({ ...form, ceilingHeight: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs">
            Kabli
            <input value={form.cabling} onChange={(e) => setForm({ ...form, cabling: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs">
            Napajanje
            <input value={form.powerSupply} onChange={(e) => setForm({ ...form, powerSupply: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs md:col-span-2">
            Osvetlitev
            <input value={form.lighting} onChange={(e) => setForm({ ...form, lighting: e.target.value })} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-1.5" />
          </label>
          <label className="text-xs md:col-span-2">
            Opombe
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="mt-1 w-full rounded border border-[var(--vo-border)] px-2 py-2" />
          </label>
        </div>
      ) : (
        <p className="text-sm text-[var(--vo-muted)]">Ni izbranega popisa.</p>
      )}
    </div>
  );
}

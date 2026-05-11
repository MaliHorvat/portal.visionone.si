"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import type { WorkspaceCtx } from "./types";

type ChecklistItem = { id: string; label: string; done: boolean };
type FieldVisit = {
  id: string;
  checkedInBy: string;
  checkInAt: string;
  checkOutAt: string | null;
  checklist: ChecklistItem[] | null;
  photoProofs: string[] | null;
  signatureDataUrl: string;
  reportText: string;
};

export function TabField({ ctx }: { ctx: WorkspaceCtx }) {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const active = useMemo(() => visits.find((v) => v.id === activeId) ?? null, [visits, activeId]);

  async function load() {
    const r = await fetch(`/api/clients/${ctx.clientId}/field-visits`);
    const j = (await r.json().catch(() => ({}))) as { visits?: FieldVisit[]; error?: string };
    if (!r.ok) {
      setError(j.error ?? "Napaka pri nalaganju.");
      return;
    }
    const rows = j.visits ?? [];
    setVisits(rows);
    if (!activeId && rows[0]) setActiveId(rows[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.clientId]);

  function setActivePatch(patch: Partial<FieldVisit>) {
    if (!active) return;
    setVisits((prev) => prev.map((v) => (v.id === active.id ? { ...v, ...patch } : v)));
  }

  async function createCheckIn() {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/clients/${ctx.clientId}/field-visits`, { method: "POST" });
    setBusy(false);
    const j = (await r.json().catch(() => ({}))) as { visit?: FieldVisit; error?: string };
    if (!r.ok || !j.visit) {
      setError(j.error ?? "Check-in ni uspel.");
      return;
    }
    setVisits((prev) => [j.visit as FieldVisit, ...prev]);
    setActiveId(j.visit.id);
  }

  async function saveVisit(extra?: Partial<FieldVisit>) {
    if (!active) return;
    setBusy(true);
    const payload = {
      checklist: active.checklist ?? [],
      photoProofs: active.photoProofs ?? [],
      signatureDataUrl: active.signatureDataUrl ?? "",
      reportText: active.reportText ?? "",
      ...extra,
    };
    const r = await fetch(`/api/clients/${ctx.clientId}/field-visits/${active.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    await load();
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;
    drawingRef.current = true;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) return;
    ctx2d.lineWidth = 2;
    ctx2d.lineCap = "round";
    ctx2d.strokeStyle = "#111827";
    ctx2d.beginPath();
    const rect = c.getBoundingClientRect();
    ctx2d.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) return;
    const rect = c.getBoundingClientRect();
    ctx2d.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx2d.stroke();
  }

  function endDraw() {
    drawingRef.current = false;
    const c = canvasRef.current;
    if (!c || !active) return;
    setActivePatch({ signatureDataUrl: c.toDataURL("image/png") });
  }

  function clearSignature() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx2d = c.getContext("2d");
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, c.width, c.height);
    setActivePatch({ signatureDataUrl: "" });
  }

  async function onPhotos(files: FileList | null) {
    if (!files || !active) return;
    const arr = Array.from(files);
    const urls: string[] = [];
    for (const f of arr) {
      const b64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result ?? ""));
        fr.onerror = () => reject(new Error("Branje slike ni uspelo."));
        fr.readAsDataURL(f);
      });
      urls.push(b64);
    }
    setActivePatch({ photoProofs: [...(active.photoProofs ?? []), ...urls] });
  }

  function exportPdf() {
    if (!active) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const yStart = 12;
    pdf.setFontSize(14);
    pdf.text("VisionOne - Poročilo terenskega obiska", 12, yStart);
    pdf.setFontSize(10);
    pdf.text(`Stranka: ${ctx.client.name}`, 12, yStart + 8);
    pdf.text(`Check-in: ${new Date(active.checkInAt).toLocaleString("sl-SI")}`, 12, yStart + 14);
    pdf.text(`Check-out: ${active.checkOutAt ? new Date(active.checkOutAt).toLocaleString("sl-SI") : "-"}`, 12, yStart + 20);
    pdf.text(`Tehnik: ${active.checkedInBy}`, 12, yStart + 26);
    pdf.text("Checklist:", 12, yStart + 34);
    let y = yStart + 40;
    for (const item of active.checklist ?? []) {
      pdf.text(`${item.done ? "[x]" : "[ ]"} ${item.label}`, 14, y);
      y += 6;
    }
    y += 4;
    pdf.text("Poročilo:", 12, y);
    const lines = pdf.splitTextToSize(active.reportText || "-", 180);
    pdf.text(lines, 12, y + 6);
    pdf.save(`field-visit-${ctx.client.name}-${active.id.slice(0, 6)}.pdf`);
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Field mode (mobilni)</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void createCheckIn()}
            disabled={busy}
            className="rounded bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Check-in na objekt
          </button>
          <button
            type="button"
            onClick={() => exportPdf()}
            disabled={!active}
            className="rounded border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            PDF povzetek
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-2">
          <p className="mb-2 text-xs font-semibold text-[var(--vo-muted)]">Obiski</p>
          <div className="space-y-1">
            {visits.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveId(v.id)}
                className={`w-full rounded px-2 py-2 text-left text-xs ${activeId === v.id ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"}`}
              >
                {new Date(v.checkInAt).toLocaleString("sl-SI")}
                <div className="text-[10px] text-[var(--vo-muted)]">{v.checkOutAt ? "zaključeno" : "odprto"}</div>
              </button>
            ))}
          </div>
        </aside>
        <div className="space-y-3 lg:col-span-2">
          {!active ? (
            <p className="text-sm text-[var(--vo-muted)]">Ni aktivnega obiska.</p>
          ) : (
            <>
              <section className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--vo-muted)]">Checklista</p>
                <div className="mt-2 space-y-2">
                  {(active.checklist ?? []).map((item, idx) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => {
                          const list = [...(active.checklist ?? [])];
                          list[idx] = { ...item, done: e.target.checked };
                          setActivePatch({ checklist: list });
                        }}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--vo-muted)]">Foto dokazila</p>
                <input className="mt-2 block text-xs" type="file" multiple accept="image/*" onChange={(e) => void onPhotos(e.target.files)} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(active.photoProofs ?? []).map((src, i) => (
                    <img key={i} src={src} alt={`dokaz-${i + 1}`} className="h-20 w-28 rounded border border-[var(--vo-border)] object-cover" />
                  ))}
                </div>
              </section>

              <section className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--vo-muted)]">Podpis stranke</p>
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={180}
                  className="mt-2 w-full rounded border border-[var(--vo-border)] bg-white"
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={clearSignature} className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs">
                    Počisti podpis
                  </button>
                </div>
              </section>

              <section className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--vo-muted)]">Poročilo po obisku</p>
                <textarea
                  rows={5}
                  value={active.reportText ?? ""}
                  onChange={(e) => setActivePatch({ reportText: e.target.value })}
                  className="mt-2 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-sm"
                  placeholder="Vpiši izvedena dela, ugotovitve, priporočila..."
                />
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveVisit()}
                  className="rounded bg-[var(--vo-accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Shrani obisk
                </button>
                <button
                  type="button"
                  disabled={busy || Boolean(active.checkOutAt)}
                  onClick={() => void saveVisit({ checkOutAt: new Date().toISOString() })}
                  className="rounded border border-[var(--vo-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  Check-out + zaključi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


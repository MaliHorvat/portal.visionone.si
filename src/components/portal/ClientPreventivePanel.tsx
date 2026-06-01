"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, HardDrive, Plus, Shield, Trash2 } from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { usePortalToast } from "@/context/PortalToastContext";
import { PREVENTIVE_KIND_LABELS } from "@/lib/client-preventive";
import type { ClientDetail, ClientPreventiveExtraItem, PreventiveItemKind } from "@/lib/types";
import type { WorkspaceCtx } from "./client-workspace/types";

const EXTRA_KINDS = Object.keys(PREVENTIVE_KIND_LABELS) as PreventiveItemKind[];

function newExtraItem(): ClientPreventiveExtraItem {
  return {
    id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    dueDate: "",
    kind: "drugo",
    note: "",
  };
}

export function ClientPreventivePanel({ ctx }: { ctx: WorkspaceCtx }) {
  const { role } = usePortalRole();
  const { showToast } = usePortalToast();
  const { client, dbConfigured, applyClient } = ctx;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(client.preventive);

  useEffect(() => {
    setForm(client.preventive);
  }, [client.preventive, client.id]);

  const save = useCallback(async () => {
    if (!dbConfigured || role !== "admin") return;
    setBusy(true);
    const extraItems = form.extraItems
      .map((x) => ({
        ...x,
        title: x.title.trim(),
        dueDate: x.dueDate.trim(),
        note: x.note.trim(),
      }))
      .filter((x) => x.title && x.dueDate);

    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preventive: {
          diskReplaceDueDate: form.diskReplaceDueDate.trim(),
          diskReplaceNote: form.diskReplaceNote.trim(),
          preventiveInspectionDueDate: form.preventiveInspectionDueDate.trim(),
          preventiveInspectionNote: form.preventiveInspectionNote.trim(),
          extraItems,
        },
      }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast("Shranjevanje preventive ni uspelo.", "err");
      return;
    }
    const j = (await res.json()) as { client?: ClientDetail };
    if (j.client) applyClient(j.client);
    showToast("Preventiva shranjena — vidna na moj.visionone.si.");
  }, [applyClient, client.id, dbConfigured, form, role, showToast]);

  if (role !== "admin") return null;

  const noPackage = !client.package;

  return (
    <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--vo-fg)]">
            <Shield className="h-4 w-4 text-[var(--vo-accent)]" aria-hidden />
            Preventiva &amp; moj.visionone.si
          </h2>
          <p className="mt-1 text-xs text-[var(--vo-muted)]">
            Roki za menjavo diska, preventivni pregled (zlasti brez paketa) in dodatne točke, ki jih stranka vidi v
            svojem portalu.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Shranjujem…" : "Shrani preventivo"}
        </button>
      </div>

      {!dbConfigured ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">Baza ni nastavljena — demo način.</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)]/50 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">
            <HardDrive className="h-3.5 w-3.5" /> Menjava diska (varnost)
          </h3>
          <p className="mt-1 text-[11px] text-[var(--vo-muted)]">
            Kdaj je zaradi starosti diska ali kapacitete priporočena menjava — stranka vidi opozorilo, ne tehnične podrobnosti.
          </p>
          <label className="mt-3 block text-xs">
            <span className="text-[var(--vo-muted)]">Rok (datum)</span>
            <input
              type="date"
              value={form.diskReplaceDueDate}
              onChange={(e) => setForm((f) => ({ ...f, diskReplaceDueDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 block text-xs">
            <span className="text-[var(--vo-muted)]">Sporočilo za stranko (neobvezno)</span>
            <textarea
              rows={2}
              value={form.diskReplaceNote}
              onChange={(e) => setForm((f) => ({ ...f, diskReplaceNote: e.target.value }))}
              placeholder="Npr. preventivna menjava diska v snemalniku zaradi zanesljivosti arhiva."
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            noPackage
              ? "border-amber-300/60 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/30"
              : "border-[var(--vo-border)] bg-[var(--vo-bg)]/50"
          }`}
        >
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">
            <CalendarClock className="h-3.5 w-3.5" /> Preventivni pregled
          </h3>
          {noPackage ? (
            <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Stranka nima vzdrževalnega paketa — priporočeno nastaviti rok letnega preventivnega pregleda.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[var(--vo-muted)]">
              Redni preventivni obisk; pri aktivnem paketu je pogosto že vključen v opomnike.
            </p>
          )}
          <label className="mt-3 block text-xs">
            <span className="text-[var(--vo-muted)]">Rok (datum)</span>
            <input
              type="date"
              value={form.preventiveInspectionDueDate}
              onChange={(e) => setForm((f) => ({ ...f, preventiveInspectionDueDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 block text-xs">
            <span className="text-[var(--vo-muted)]">Sporočilo za stranko</span>
            <textarea
              rows={2}
              value={form.preventiveInspectionNote}
              onChange={(e) => setForm((f) => ({ ...f, preventiveInspectionNote: e.target.value }))}
              placeholder="Npr. letni preventivni pregled sistema brez naročenega paketa vzdrževanja."
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--vo-muted)]">
            Dodatna preventiva (na moj portalu)
          </h3>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, extraItems: [...f.extraItems, newExtraItem()] }))}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--vo-surface-2)]"
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj
          </button>
        </div>
        {form.extraItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--vo-border)] px-3 py-4 text-center text-xs text-[var(--vo-muted)]">
            Npr. posodobitev FW, baterije UPS, certifikati …
          </p>
        ) : (
          <ul className="space-y-2">
            {form.extraItems.map((item, idx) => (
              <li
                key={item.id}
                className="grid gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)]/40 p-3 sm:grid-cols-2"
              >
                <input
                  value={item.title}
                  onChange={(e) =>
                    setForm((f) => {
                      const extraItems = [...f.extraItems];
                      extraItems[idx] = { ...extraItems[idx]!, title: e.target.value };
                      return { ...f, extraItems };
                    })
                  }
                  placeholder="Naslov"
                  className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm sm:col-span-2"
                />
                <select
                  value={item.kind}
                  onChange={(e) =>
                    setForm((f) => {
                      const extraItems = [...f.extraItems];
                      extraItems[idx] = {
                        ...extraItems[idx]!,
                        kind: e.target.value as PreventiveItemKind,
                      };
                      return { ...f, extraItems };
                    })
                  }
                  className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
                >
                  {EXTRA_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PREVENTIVE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={item.dueDate}
                  onChange={(e) =>
                    setForm((f) => {
                      const extraItems = [...f.extraItems];
                      extraItems[idx] = { ...extraItems[idx]!, dueDate: e.target.value };
                      return { ...f, extraItems };
                    })
                  }
                  className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
                />
                <textarea
                  rows={1}
                  value={item.note}
                  onChange={(e) =>
                    setForm((f) => {
                      const extraItems = [...f.extraItems];
                      extraItems[idx] = { ...extraItems[idx]!, note: e.target.value };
                      return { ...f, extraItems };
                    })
                  }
                  placeholder="Kratka opomba za stranko"
                  className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm sm:col-span-2"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, extraItems: f.extraItems.filter((_, i) => i !== idx) }))
                  }
                  className="inline-flex items-center gap-1 text-xs text-red-600 sm:col-span-2"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Odstrani
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

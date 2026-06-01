"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  DashboardWidgetBlock,
  DashboardStatsActivitiesRow,
  shouldPairStatsActivities,
  type DashboardBlocksCtx,
} from "@/components/portal/dashboard/DashboardWidgetBlocks";
import {
  DASHBOARD_WIDGET_CATALOG,
  addWidget,
  getWidgetMeta,
  moveWidget,
  removeWidget,
  resetDashboardLayout,
  saveDashboardLayout,
  type DashboardLayout,
  type DashboardWidgetInstance,
} from "@/lib/dashboard-widgets";

type Props = {
  layout: DashboardLayout;
  onLayoutChange: (layout: DashboardLayout) => void;
  ctx: DashboardBlocksCtx;
};

export function DashboardWidgetGrid({ layout, onLayoutChange, ctx }: Props) {
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const usedTypes = useMemo(() => new Set(layout.widgets.map((w) => w.type)), [layout.widgets]);
  const availableToAdd = DASHBOARD_WIDGET_CATALOG.filter((c) => !usedTypes.has(c.type));

  function apply(next: DashboardLayout) {
    saveDashboardLayout(next);
    onLayoutChange(next);
  }

  function renderWidget(widget: DashboardWidgetInstance, index: number) {
    const meta = getWidgetMeta(widget.type);
    const pairNext =
      widget.type === "stats" &&
      shouldPairStatsActivities(layout) &&
      layout.widgets[index + 1]?.type === "activities";

    if (pairNext) {
      return (
        <WidgetShell
          key={`pair-${widget.id}`}
          widget={widget}
          paired
          editing={editing}
          layout={layout}
          index={index}
          title={`${getWidgetMeta("stats").title} + ${getWidgetMeta("activities").title}`}
          onMove={apply}
          onRemove={apply}
        >
          <DashboardStatsActivitiesRow ctx={ctx} />
        </WidgetShell>
      );
    }

    if (
      widget.type === "activities" &&
      shouldPairStatsActivities(layout) &&
      layout.widgets[index - 1]?.type === "stats"
    ) {
      return null;
    }

    return (
      <WidgetShell
        key={widget.id}
        widget={widget}
        editing={editing}
        layout={layout}
        index={index}
        title={meta.title}
        onMove={apply}
        onRemove={apply}
      >
        <DashboardWidgetBlock widget={widget} ctx={ctx} />
      </WidgetShell>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
            <button
              type="button"
              className="vo-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              onClick={() => {
                apply(resetDashboardLayout());
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Privzeto
            </button>
            <div className="relative">
              <button
                type="button"
                disabled={availableToAdd.length === 0}
                className="vo-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
                onClick={() => setAddOpen((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" /> Dodaj widget
                <ChevronDown className={`h-3 w-3 transition ${addOpen ? "rotate-180" : ""}`} />
              </button>
              {addOpen && availableToAdd.length > 0 ? (
                <ul className="absolute right-0 z-20 mt-1 min-w-[240px] rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] py-1 shadow-lg">
                  {availableToAdd.map((c) => (
                    <li key={c.type}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--vo-surface-2)]"
                        onClick={() => {
                          apply(addWidget(layout, c.type));
                          setAddOpen(false);
                        }}
                      >
                        <span className="font-medium text-[var(--vo-fg)]">{c.title}</span>
                        <span className="mt-0.5 block text-[10px] text-[var(--vo-muted)]">{c.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </>
        ) : null}
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            editing
              ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
              : "border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
          }`}
          onClick={() => {
            setEditing((v) => !v);
            setAddOpen(false);
          }}
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          {editing ? "Končaj urejanje" : "Uredi widgete"}
        </button>
      </div>

      {editing ? (
        <p className="rounded-lg border border-dashed border-[var(--vo-accent)]/40 bg-[var(--vo-accent-muted)]/20 px-3 py-2 text-xs text-[var(--vo-muted)]">
          Premakni widgete gor/dol, odstrani jih ali dodaj nove. Spremembe se shranijo v brskalniku.
        </p>
      ) : null}

      <div className="space-y-8">
        {layout.widgets.map((w, i) => renderWidget(w, i))}
        {layout.widgets.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--vo-muted)]">
            Ni widgetov. Klikni <strong>Uredi widgete</strong> in dodaj prvega.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WidgetShell({
  widget,
  paired,
  editing,
  layout,
  index,
  title,
  onMove,
  onRemove,
  children,
}: {
  widget: DashboardWidgetInstance;
  paired?: boolean;
  editing: boolean;
  layout: DashboardLayout;
  index: number;
  title: string;
  onMove: (l: DashboardLayout) => void;
  onRemove: (l: DashboardLayout) => void;
  children: React.ReactNode;
}) {
  const idsToRemove = paired
    ? [widget.id, layout.widgets[index + 1]?.id].filter(Boolean) as string[]
    : [widget.id];

  return (
    <div
      className={`relative ${editing ? "rounded-xl ring-2 ring-[var(--vo-accent)]/30 ring-offset-2 ring-offset-[var(--vo-bg)]" : ""}`}
    >
      {editing ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-1.5">
          <GripVertical className="h-4 w-4 text-[var(--vo-muted)]" aria-hidden />
          <span className="flex-1 text-xs font-semibold text-[var(--vo-fg)]">{title}</span>
          <button
            type="button"
            title="Premakni gor"
            disabled={index === 0}
            className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface)] disabled:opacity-30"
            onClick={() => onMove(moveWidget(layout, widget.id, -1))}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Premakni dol"
            disabled={index >= layout.widgets.length - (paired ? 2 : 1)}
            className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface)] disabled:opacity-30"
            onClick={() => onMove(moveWidget(layout, widget.id, 1))}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Odstrani"
            className="rounded p-1 text-[var(--vo-danger)] hover:bg-[var(--vo-danger-muted)]"
            onClick={() => {
              let next = layout;
              for (const id of idsToRemove) {
                next = removeWidget(next, id);
              }
              onRemove(next);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}

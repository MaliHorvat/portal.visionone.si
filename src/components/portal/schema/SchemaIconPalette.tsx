"use client";

import { useMemo, useState } from "react";
import { SchemaIcon } from "./SchemaIcon";
import { ICON_CATALOG, ICON_CATEGORIES } from "./schema-icon-catalog";
import type { SchemaIconKey } from "@/lib/schema-icons";
import type { TopologyDeviceKind } from "@/lib/types";

export type InventoryDragItem = {
  type: "inventory";
  kind: TopologyDeviceKind;
  id: string;
  label: string;
};

export type SymbolDragItem = {
  type: "symbol";
  iconKey: SchemaIconKey;
  label: string;
};

type InventoryGroup = { title: string; items: InventoryDragItem[] };

type Props = {
  inventoryGroups: InventoryGroup[];
  editMode: boolean;
  dbConfigured: boolean;
  getDeviceStatus: (kind: TopologyDeviceKind, id: string) => "online" | "offline";
};

export function SchemaIconPalette({ inventoryGroups, editMode, dbConfigured, getDeviceStatus }: Props) {
  const [iconSearch, setIconSearch] = useState("");
  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return ICON_CATALOG;
    return ICON_CATALOG.filter((e) => e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [iconSearch]);

  const onSymbolDrag = (e: React.DragEvent, item: SymbolDragItem) => {
    if (!editMode) return;
    e.dataTransfer.setData("application/vnd.visionone.schema", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onInventoryDrag = (e: React.DragEvent, item: InventoryDragItem) => {
    if (!editMode) return;
    e.dataTransfer.setData("application/vnd.visionone.schema", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-2 text-xs lg:w-52 xl:w-56">
      <p className="px-1 font-semibold text-[var(--vo-fg)]">Ikone &amp; inventar</p>
      <input
        type="search"
        placeholder="Išči ikono…"
        value={iconSearch}
        onChange={(e) => setIconSearch(e.target.value)}
        className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 text-[var(--vo-fg)]"
      />
      <div className="max-h-[200px] overflow-y-auto rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] p-1.5">
        {ICON_CATEGORIES.map((cat) => {
          const items = filteredIcons.filter((e) => e.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} className="mb-2 last:mb-0">
              <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--vo-muted)]">{cat}</p>
              <div className="grid grid-cols-4 gap-1">
                {items.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    title={entry.label}
                    draggable={editMode && dbConfigured}
                    onDragStart={(e) =>
                      onSymbolDrag(e, { type: "symbol", iconKey: entry.key, label: entry.label })
                    }
                    className="flex flex-col items-center gap-0.5 rounded p-0.5 hover:bg-[var(--vo-surface-2)] active:cursor-grabbing"
                  >
                    <SchemaIcon iconKey={entry.key} color={entry.defaultColor} size={28} status="unknown" />
                    <span className="max-w-full truncate text-[8px] text-[var(--vo-muted)]">{entry.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-1 text-[10px] text-[var(--vo-muted)]">Povleci ikono ali napravo na načrt.</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {inventoryGroups.map((g) => (
          <div key={g.title} className="mb-2">
            <p className="font-medium text-[var(--vo-muted)]">{g.title}</p>
            <ul className="mt-1 space-y-0.5">
              {g.items.map((item) => {
                const st = getDeviceStatus(item.kind, item.id);
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    draggable={editMode && dbConfigured}
                    onDragStart={(e) => onInventoryDrag(e, item)}
                    className="flex cursor-grab items-center gap-2 rounded border border-[var(--vo-border)] px-2 py-1 active:cursor-grabbing"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${st === "online" ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

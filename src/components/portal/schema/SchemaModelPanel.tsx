"use client";

import { useMemo, useState } from "react";
import { SchemaIcon } from "./SchemaIcon";
import { catalogEntry } from "@/lib/schema-icon-catalog";
import {
  buildSchemaModelLibrary,
  searchSchemaModels,
  type SchemaModelEntry,
} from "@/lib/schema-model-library";
import type { ClientDetail, TopologyCanvasNode } from "@/lib/types";

type Props = {
  client: ClientDetail;
  selectedNodeId: string | null;
  editMode: boolean;
  onApplyModel: (entry: SchemaModelEntry, nodeId: string) => void;
};

export function SchemaModelPanel({ client, selectedNodeId, editMode, onApplyModel }: Props) {
  const [query, setQuery] = useState("");
  const library = useMemo(() => buildSchemaModelLibrary(client), [client]);
  const results = useMemo(() => searchSchemaModels(library, query), [library, query]);

  return (
    <div className="mt-2 border-t border-[var(--vo-border)] pt-2">
      <p className="px-1 font-semibold text-[var(--vo-fg)]">Knjižnica modelov</p>
      <input
        type="search"
        placeholder="Išči proizvajalca / model…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-1 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 text-[var(--vo-fg)]"
      />
      {!selectedNodeId ? (
        <p className="mt-2 px-1 text-[10px] text-[var(--vo-muted)]">Izberite napravo na shemi za uporabo modela.</p>
      ) : null}
      <ul className="mt-2 max-h-[180px] space-y-1 overflow-y-auto">
        {results.map((entry) => {
          const icon = catalogEntry(entry.iconKey);
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={!editMode || !selectedNodeId}
                onClick={() => selectedNodeId && onApplyModel(entry, selectedNodeId)}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left hover:bg-[var(--vo-surface-2)] disabled:opacity-40"
              >
                <SchemaIcon iconKey={entry.iconKey} color={icon.defaultColor} size={24} status="unknown" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-[var(--vo-fg)]">
                    {entry.manufacturer} {entry.model}
                  </span>
                  <span className="text-[10px] text-[var(--vo-muted)]">{entry.category}</span>
                </span>
              </button>
            </li>
          );
        })}
        {results.length === 0 ? (
          <li className="px-1 text-[10px] text-[var(--vo-muted)]">Ni zadetkov.</li>
        ) : null}
      </ul>
    </div>
  );
}

export function applyModelToNode(node: TopologyCanvasNode, entry: SchemaModelEntry): Partial<TopologyCanvasNode> {
  const icon = catalogEntry(entry.iconKey);
  return {
    iconKey: entry.iconKey,
    appearance: {
      ...node.appearance,
      iconColor: icon.defaultColor,
      showFov: entry.iconKey.startsWith("camera-"),
    },
    planMeta: {
      ...node.planMeta,
      manufacturer: entry.manufacturer,
      model: entry.model,
    },
    cameraPlan:
      entry.defaultFovDeg && entry.iconKey.startsWith("camera-")
        ? { ...node.cameraPlan, fovDeg: entry.defaultFovDeg }
        : node.cameraPlan,
  };
}

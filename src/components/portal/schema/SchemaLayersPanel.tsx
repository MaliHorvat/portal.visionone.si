"use client";

import type { ClientTopologyState } from "@/lib/types";
import { DEFAULT_LAYER_VISIBILITY, mergeLayerVisibility } from "@/lib/schema-design-extras";

type Props = {
  visibility: ClientTopologyState["layerVisibility"];
  onChange: (v: NonNullable<ClientTopologyState["layerVisibility"]>) => void;
  planNotes: string;
  onPlanNotes: (notes: string) => void;
};

const LAYERS: { key: keyof NonNullable<ClientTopologyState["layerVisibility"]>; label: string }[] = [
  { key: "background", label: "Ozadje / mapa" },
  { key: "walls", label: "Stene / tloris" },
  { key: "cables", label: "Kabli" },
  { key: "fov", label: "Polja vidnosti" },
  { key: "devices", label: "Naprave" },
  { key: "edges", label: "Povezave" },
];

export function SchemaLayersPanel({ visibility, onChange, planNotes, onPlanNotes }: Props) {
  const v = mergeLayerVisibility(visibility);
  return (
    <div className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
      <p className="font-semibold text-[var(--vo-fg)]">Sloji &amp; opombe</p>
      <ul className="space-y-1">
        {LAYERS.map(({ key, label }) => (
          <li key={key}>
            <label className="flex cursor-pointer items-center gap-2 text-[var(--vo-muted)]">
              <input
                type="checkbox"
                checked={v[key] !== false}
                onChange={(e) => onChange({ ...v, [key]: e.target.checked })}
              />
              {label}
            </label>
          </li>
        ))}
      </ul>
      <label className="block text-[var(--vo-muted)]">
        Opombe projekta
        <textarea
          value={planNotes}
          onChange={(e) => onPlanNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 text-[var(--vo-fg)]"
          placeholder="Pogoji, opozorila, kontakt na objektu…"
        />
      </label>
    </div>
  );
}

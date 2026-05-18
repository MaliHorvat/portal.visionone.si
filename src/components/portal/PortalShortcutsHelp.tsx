"use client";

import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: "Ctrl + K", desc: "Ukazna paleta (hitro iskanje)" },
  { keys: "/", desc: "Fokus iskanja v glavi" },
  { keys: "?", desc: "Ta seznam bližnjic" },
  { keys: "Esc", desc: "Zapri pogovorna okna" },
];

type Props = { open: boolean; onClose: () => void };

export function PortalShortcutsHelp({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--vo-fg)]">Bližnjice na tipkovnici</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex justify-between gap-4">
              <kbd className="shrink-0 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
              <span className="text-right text-[var(--vo-muted)]">{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

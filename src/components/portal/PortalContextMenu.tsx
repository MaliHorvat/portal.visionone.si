"use client";

import { useEffect } from "react";

export type ContextMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

export function PortalContextMenu({ open, x, y, items, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open || items.length === 0) return null;

  return (
    <div
      className="fixed z-[120] min-w-[170px] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1 shadow-xl"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          className={`block w-full rounded px-3 py-2 text-left text-xs disabled:opacity-40 ${
            item.danger
              ? "text-red-500 hover:bg-red-500/10"
              : "text-[var(--vo-fg)] hover:bg-[var(--vo-surface-2)]"
          }`}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

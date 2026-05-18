"use client";

import { useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { getClientInternalNote, setClientInternalNote } from "@/lib/portal-prefs";

type Props = { clientId: string };

export function ClientInternalNotes({ clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(getClientInternalNote(clientId));
  }, [clientId]);

  function save() {
    setClientInternalNote(clientId, text);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  if (!open) {
    const preview = text.trim();
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
      >
        <StickyNote className="h-3.5 w-3.5" />
        {preview ? `Interna opomba: ${preview.slice(0, 48)}${preview.length > 48 ? "…" : ""}` : "Dodaj interno opombo (samo v brskalniku)"}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-[var(--vo-border)] bg-[var(--vo-surface-2)]/50 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--vo-muted)]">Interna opomba (lokalno)</span>
        <button type="button" className="text-xs text-[var(--vo-muted)] hover:underline" onClick={() => setOpen(false)}>
          Skrij
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Npr. dostopna koda, posebnosti objekta, kontakt za alarm …"
        className="w-full rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 text-xs"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded bg-[var(--vo-accent)] px-2.5 py-1 text-xs font-medium text-white"
        >
          Shrani opombo
        </button>
        {saved ? <span className="text-xs text-[var(--vo-ok)]">Shranjeno</span> : null}
      </div>
    </div>
  );
}

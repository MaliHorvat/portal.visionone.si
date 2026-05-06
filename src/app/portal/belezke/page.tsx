"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminGate } from "@/components/portal/AdminGate";

type NoteRow = {
  id: number;
  title: string;
  content: string;
  isFolder: boolean;
  parentId: number | null;
};

const TAB_LABELS: Record<string, string> = {
  dokumentacija: "Dokumentacija",
  belezke: "Beležke",
  "privzeta-gesla": "Privzeta gesla",
  firmware: "Firmware baza",
};

const TAB_PREFIX: Record<string, string> = {
  dokumentacija: "DOC:",
  belezke: "",
  "privzeta-gesla": "PWD:",
  firmware: "FW:",
};

function parseTab(raw: string | null) {
  const t = raw ?? "belezke";
  return TAB_LABELS[t] ? t : "belezke";
}

function stripPrefix(title: string) {
  for (const p of Object.values(TAB_PREFIX)) {
    if (!p) continue;
    if (title.startsWith(p)) return title.slice(p.length).trim();
  }
  return title;
}

export default function BelezkePage() {
  const sp = useSearchParams();
  const tab = parseTab(sp.get("tab"));
  const prefix = TAB_PREFIX[tab] ?? "";
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/notes", { credentials: "include" });
    const data = (await res.json()) as { notes?: NoteRow[] };
    setNotes(data.notes ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${prefix}${prefix ? " " : ""}${title}`.trim(), content, isFolder: false }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setMsg(err.error ?? "Napaka.");
      return;
    }
    setTitle("");
    setContent("");
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Izbrisati beležko?")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  const visibleNotes = notes.filter((n) => {
    if (tab === "belezke") {
      return !Object.values(TAB_PREFIX)
        .filter(Boolean)
        .some((p) => n.title.startsWith(p));
    }
    return n.title.startsWith(prefix);
  });

  return (
    <AdminGate>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">{TAB_LABELS[tab]}</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Enostavne beležke (ekvivalent <code className="text-xs">user_notes</code> iz desktop programa).
          </p>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1 text-sm">
          {Object.entries(TAB_LABELS).map(([k, label]) => (
            <a
              key={k}
              href={`/portal/belezke?tab=${encodeURIComponent(k)}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                k === tab ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]" : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        <form
          onSubmit={addNote}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
        >
          <input
            required
            placeholder="Naslov"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Vsebina"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Dodaj
          </button>
          {msg ? <p className="text-sm text-[var(--vo-danger)]">{msg}</p> : null}
        </form>

        <ul className="space-y-2">
          {visibleNotes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4"
            >
              <div>
                <p className="font-medium text-[var(--vo-fg)]">{stripPrefix(n.title)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--vo-muted)]">{n.content}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(n.id)}
                className="shrink-0 text-xs text-[var(--vo-danger)] hover:underline"
              >
                Briši
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AdminGate>
  );
}

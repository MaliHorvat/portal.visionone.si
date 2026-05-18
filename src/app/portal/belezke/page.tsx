"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, RefreshCw, Search } from "lucide-react";
import { AdminGate } from "@/components/portal/AdminGate";
import { exportNotesCsv } from "@/lib/portal-export";

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
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"title" | "id">("id");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", { credentials: "include" });
      const data = (await res.json()) as { notes?: NoteRow[] };
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
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
      body: JSON.stringify({
        title: `${prefix}${prefix ? " " : ""}${title}`.trim(),
        content,
        isFolder: false,
      }),
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
    await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  const tabNotes = useMemo(
    () =>
      notes.filter((n) => {
        if (tab === "belezke") {
          return !Object.values(TAB_PREFIX)
            .filter(Boolean)
            .some((p) => n.title.startsWith(p));
        }
        return n.title.startsWith(prefix);
      }),
    [notes, tab, prefix],
  );

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = tabNotes.filter((n) => {
      if (!q) return true;
      const t = stripPrefix(n.title).toLowerCase();
      return t.includes(q) || n.content.toLowerCase().includes(q);
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "title") {
        return stripPrefix(a.title).localeCompare(stripPrefix(b.title), "sl");
      }
      return b.id - a.id;
    });
    return rows;
  }, [tabNotes, search, sort]);

  async function copyContent(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Vsebina kopirana.");
      window.setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsg("Kopiranje ni uspelo.");
    }
  }

  return (
    <AdminGate>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">
            {TAB_LABELS[tab]}
          </h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Enostavne beležke (ekvivalent{" "}
            <code className="text-xs">user_notes</code> iz desktop programa).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vo-muted)]" />
            <input
              type="search"
              placeholder="Išči po naslovu ali vsebini…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "title" | "id")}
            className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm"
            aria-label="Razvrsti"
          >
            <option value="id">Najnovejše</option>
            <option value="title">Po naslovu</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Osveži
          </button>
          <button
            type="button"
            onClick={() =>
              exportNotesCsv(
                visibleNotes.map((n) => ({
                  title: stripPrefix(n.title),
                  content: n.content,
                })),
              )
            }
            disabled={visibleNotes.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <span className="text-xs text-[var(--vo-muted)]">
            {visibleNotes.length} zapisov
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1 text-sm">
          {Object.entries(TAB_LABELS).map(([k, label]) => (
            <a
              key={k}
              href={`/portal/belezke?tab=${encodeURIComponent(k)}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                k === tab
                  ? "bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                  : "text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)]"
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
          {msg ? (
            <p className="text-sm text-[var(--vo-danger)]">{msg}</p>
          ) : null}
        </form>

        <ul className="space-y-2">
          {visibleNotes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4"
            >
              <div>
                <p className="font-medium text-[var(--vo-fg)]">
                  {stripPrefix(n.title)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--vo-muted)]">
                  {n.content}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => void copyContent(n.content)}
                  className="text-xs text-[var(--vo-accent)] hover:underline"
                >
                  Kopiraj
                </button>
                <button
                  type="button"
                  onClick={() => void remove(n.id)}
                  className="text-xs text-[var(--vo-danger)] hover:underline"
                >
                  Briši
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AdminGate>
  );
}

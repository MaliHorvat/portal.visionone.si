"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

type DocRow = {
  id: string;
  folder: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function breadcrumbs(folderFilter: string | null): { label: string; target: string | null }[] {
  const items: { label: string; target: string | null }[] = [{ label: "Dokumenti", target: null }];
  if (folderFilter === null) {
    items.push({ label: "Vse", target: null });
    return items;
  }
  if (folderFilter === "") {
    items.push({ label: "Koren", target: "" });
    return items;
  }
  const parts = folderFilter.split("/").filter(Boolean);
  let acc = "";
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p;
    items.push({ label: p, target: acc });
  }
  return items;
}

export function TabDokumenti({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured } = ctx;
  const fileRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState("");
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("zapis");
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    if (!dbConfigured) return;
    const qs =
      folderFilter === null ? "" : `?folder=${encodeURIComponent(folderFilter)}`;
    const r = await fetch(`/api/clients/${clientId}/documents${qs}`);
    if (!r.ok) return;
    const j = (await r.json()) as { folders?: string[]; documents?: DocRow[] };
    setFolders(j.folders ?? []);
    setDocuments(j.documents ?? []);
  }, [clientId, dbConfigured, folderFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (folderFilter === null) setUploadFolder("");
    else if (folderFilter !== "") setUploadFolder(folderFilter);
  }, [folderFilter]);

  async function uploadSingleBlob(blob: Blob, fileName: string) {
    const fd = new FormData();
    fd.set("folder", uploadFolder.trim());
    fd.set("file", blob, fileName);
    const r = await fetch(`/api/clients/${clientId}/documents`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(typeof j?.error === "string" ? j.error : "Nalaganje ni uspelo.");
    }
  }

  async function flushPending() {
    if (!dbConfigured || !pending.length) return;
    const batch = [...pending];
    const n = batch.length;
    setBusy(true);
    let uploaded = 0;
    try {
      for (const file of batch) {
        await uploadSingleBlob(file, file.name);
        uploaded++;
      }
      setPending([]);
      showToast(n === 1 ? "Datoteka shranjena." : `${n} datotek shranjenih.`);
      await load();
    } catch (e) {
      setPending((q) => q.slice(uploaded));
      if (uploaded > 0) await load();
      showToast(e instanceof Error ? e.message : "Napaka pri nalaganju.", "err");
    } finally {
      setBusy(false);
    }
  }

  function navigateFolderUp() {
    if (folderFilter === null) return;
    if (folderFilter === "") {
      setFolderFilter(null);
      return;
    }
    const idx = folderFilter.lastIndexOf("/");
    if (idx <= 0) setFolderFilter("");
    else setFolderFilter(folderFilter.slice(0, idx));
  }

  function addFilesToQueue(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setPending((q) => [...q, ...arr]);
    showToast(`${arr.length} datotek v čakalni vrsti — pritisnite »Shrani datoteke«.`);
  }

  async function saveNote() {
    if (!dbConfigured || !noteText.trim()) {
      showToast("Vnesite besedilo zapisa.", "err");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/clients/${clientId}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "note",
          folder: uploadFolder.trim(),
          title: noteTitle.trim() || "zapis",
          text: noteText,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(typeof j?.error === "string" ? j.error : "Shranjevanje zapisa ni uspelo.", "err");
        return;
      }
      setNoteOpen(false);
      setNoteText("");
      setNoteTitle("zapis");
      await load();
      showToast("Zapis shranjen.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDoc(id: string) {
    if (!confirm("Izbrisati dokument?")) return;
    const r = await fetch(`/api/clients/${clientId}/documents/${id}`, { method: "DELETE" });
    if (!r.ok) {
      showToast("Brisanje ni uspelo.", "err");
      return;
    }
    await load();
    showToast("Izbrisano.");
  }

  const crumbs = breadcrumbs(folderFilter);

  return (
    <div className="flex h-[min(720px,85vh)] flex-col gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] text-xs shadow-[var(--vo-card-shadow)]">
      {/* Explorer vrstica */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-2 py-2">
        <button
          type="button"
          disabled={busy || folderFilter === null}
          title="Nivo gor"
          onClick={() => navigateFolderUp()}
          className="rounded border border-[var(--vo-border)] p-1.5 text-[var(--vo-fg)] hover:bg-[var(--vo-surface)] disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void load()}
          title="Osveži"
          className="rounded border border-[var(--vo-border)] p-1.5 text-[var(--vo-fg)] hover:bg-[var(--vo-surface)] disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--vo-border)]" aria-hidden />
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 font-medium text-[var(--vo-fg)] hover:bg-[var(--vo-surface)] disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Dodaj datoteke
        </button>
        <button
          type="button"
          disabled={busy || !dbConfigured || pending.length === 0}
          onClick={() => void flushPending()}
          className="inline-flex items-center gap-1.5 rounded bg-[var(--vo-fg)] px-2 py-1.5 font-semibold text-[var(--vo-bg)] disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          Shrani datoteke
        </button>
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => setNoteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded border border-[var(--vo-border)] px-2 py-1.5 font-medium text-[var(--vo-fg)] hover:bg-[var(--vo-surface)] disabled:opacity-40"
        >
          <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
          Dodaj zapis
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const fl = e.target.files;
            e.target.value = "";
            if (fl?.length) addFilesToQueue(fl);
          }}
        />
      </div>

      {/* Breadcrumb kot Explorer */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-1 text-[11px] text-[var(--vo-muted)]">
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-0.5">
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden /> : null}
            <button
              type="button"
              className={`rounded px-1 py-0.5 hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)] ${
                i === crumbs.length - 1 ? "font-semibold text-[var(--vo-fg)]" : ""
              }`}
              onClick={() => setFolderFilter(c.target)}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {!dbConfigured ? (
        <p className="px-3 pb-2 text-sm text-amber-200">Za dokumente je potrebna baza.</p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 md:flex-row">
        {/* Levi panel — mape */}
        <aside className="flex w-full shrink-0 flex-col rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] md:w-52">
          <div className="flex items-center gap-2 border-b border-[var(--vo-border)] px-2 py-2 font-semibold text-[var(--vo-fg)]">
            <FolderOpen className="h-4 w-4 opacity-80" aria-hidden />
            Mape
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1 md:max-h-none md:flex-1">
            <button
              type="button"
              onClick={() => setFolderFilter(null)}
              className={`flex w-full rounded px-2 py-2 text-left ${
                folderFilter === null ? "bg-[var(--vo-accent-muted)] font-medium text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"
              }`}
            >
              Vse datoteke
            </button>
            <button
              type="button"
              onClick={() => setFolderFilter("")}
              className={`flex w-full rounded px-2 py-2 text-left ${
                folderFilter === "" ? "bg-[var(--vo-accent-muted)] font-medium text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"
              }`}
            >
              Koren (brez mape)
            </button>
            {folders.filter((f) => f !== "").map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFolderFilter(f)}
                className={`flex w-full truncate rounded px-2 py-2 text-left font-mono ${
                  folderFilter === f ? "bg-[var(--vo-accent-muted)] font-medium text-[var(--vo-accent)]" : "hover:bg-[var(--vo-surface-2)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </aside>

        {/* Desni panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2">
            <label className="flex flex-col gap-1 text-[var(--vo-muted)]">
              Ciljna mapa za nalaganje / zapis
              <input
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                placeholder="npr. Pogodbe ali Slike/hodnik — ali izberi mapo na levi"
                className="rounded border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 font-mono text-[var(--vo-fg)]"
              />
            </label>
          </div>

          {pending.length > 0 ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[var(--vo-fg)]">
              <p className="font-medium text-amber-200">Čakajo na shranjevanje ({pending.length})</p>
              <ul className="mt-1 max-h-24 overflow-y-auto font-mono text-[11px] text-[var(--vo-muted)]">
                {pending.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-red-400 hover:underline"
                      onClick={() => setPending((q) => q.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) addFilesToQueue(e.dataTransfer.files);
            }}
            className={`flex min-h-[100px] flex-1 flex-col rounded-lg border-2 border-dashed px-3 py-6 transition-colors ${
              dragOver
                ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)]"
                : "border-[var(--vo-border)] bg-[var(--vo-bg)]"
            }`}
          >
            <p className="text-center text-[var(--vo-muted)]">
              Povleci datoteke sem → dodajo se v vrsto. Nato <strong className="text-[var(--vo-fg)]">Shrani datoteke</strong>.
            </p>
            <p className="mt-1 text-center text-[10px] text-[var(--vo-muted)]">Največ 25 MB na datoteko.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)]">
            <table className="w-full min-w-[560px] text-left">
              <thead className="sticky top-0 border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
                <tr>
                  <th className="px-3 py-2">Mapa</th>
                  <th className="px-3 py-2">Ime</th>
                  <th className="px-3 py-2">Velikost</th>
                  <th className="px-3 py-2">Spremenjeno</th>
                  <th className="px-3 py-2 text-right">Akciije</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--vo-border)] hover:bg-[var(--vo-surface-2)]/60">
                    <td className="px-3 py-2 font-mono text-[var(--vo-muted)]">{d.folder || "—"}</td>
                    <td className="px-3 py-2">
                      <a
                        href={`/api/clients/${clientId}/documents/${d.id}`}
                        className="text-[var(--vo-accent)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {d.originalName}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-[var(--vo-muted)]">{fmtSize(d.sizeBytes)}</td>
                    <td className="px-3 py-2 text-[var(--vo-muted)]">
                      {new Date(d.createdAt).toLocaleString("sl-SI")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-red-500 hover:underline"
                        onClick={() => void removeDoc(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {documents.length === 0 ? (
              <p className="px-3 py-8 text-center text-[var(--vo-muted)]">Ta mapa je prazna.</p>
            ) : null}
          </div>
        </div>
      </div>

      {noteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Nov tekstovni zapis</h3>
            <p className="mt-1 text-[11px] text-[var(--vo-muted)]">Shrani se kot .txt v izbrano mapo.</p>
            <label className="mt-3 flex flex-col gap-1 text-[var(--vo-muted)]">
              Naslov datoteke
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-2 text-[var(--vo-fg)]"
              />
            </label>
            <label className="mt-2 flex flex-col gap-1 text-[var(--vo-muted)]">
              Besedilo
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={6}
                className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-2 text-[var(--vo-fg)]"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-[var(--vo-border)] px-3 py-2"
                onClick={() => setNoteOpen(false)}
              >
                Prekliči
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-[var(--vo-accent)] px-3 py-2 font-semibold text-white disabled:opacity-40"
                onClick={() => void saveNote()}
              >
                Shrani zapis
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

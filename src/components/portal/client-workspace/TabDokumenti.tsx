"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Trash2, Upload } from "lucide-react";
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

export function TabDokumenti({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { clientId, dbConfigured } = ctx;
  const [folders, setFolders] = useState<string[]>([]);
  /** null = pokaži vse datoteke; string (vključno "") = filtriraj po mapi */
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState("");
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  async function uploadFiles(files: FileList | File[]) {
    if (!dbConfigured) return;
    const arr = Array.from(files);
    if (!arr.length) return;
    setBusy(true);
    try {
      for (const file of arr) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("folder", uploadFolder.trim());
        const r = await fetch(`/api/clients/${clientId}/documents`, {
          method: "POST",
          body: fd,
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          showToast(j?.error ?? "Nalaganje ni uspelo.", "err");
          setBusy(false);
          return;
        }
      }
      showToast(arr.length === 1 ? "Datoteka shranjena." : `${arr.length} datotek shranjenih.`);
      await load();
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 lg:w-56">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--vo-fg)]">
          <FolderOpen className="h-4 w-4 opacity-80" aria-hidden />
          Mape
        </p>
        <button
          type="button"
          onClick={() => setFolderFilter(null)}
          className={`w-full rounded-lg border px-2 py-2 text-left text-xs ${
            folderFilter === null
              ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
              : "border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
          }`}
        >
          Vse datoteke
        </button>
        <button
          type="button"
          onClick={() => {
            setFolderFilter("");
            setUploadFolder("");
          }}
          className={`w-full rounded-lg border px-2 py-2 text-left text-xs ${
            folderFilter === ""
              ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
              : "border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
          }`}
        >
          Koren (brez mape)
        </button>
        {folders.filter((f) => f !== "").map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFolderFilter(f);
              setUploadFolder(f);
            }}
            className={`w-full truncate rounded-lg border px-2 py-2 text-left text-xs ${
              folderFilter === f
                ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
                : "border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            }`}
          >
            {f || "—"}
          </button>
        ))}
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {!dbConfigured ? (
          <p className="text-sm text-amber-200">Za dokumente je potrebna baza.</p>
        ) : null}

        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-xs">
          <p className="font-semibold text-[var(--vo-fg)]">Naloži v mapo</p>
          <label className="mt-2 flex flex-col gap-1 text-[var(--vo-muted)]">
            Pot mape (npr. <span className="font-mono text-[var(--vo-fg)]">Pogodbe</span> ali{" "}
            <span className="font-mono text-[var(--vo-fg)]">Slike/hodnik</span>)
            <input
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              placeholder="Pusti prazno za koren ali izberi mapo na levi"
              className="rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-2 text-[var(--vo-fg)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--vo-fg)] px-3 py-2 text-[var(--vo-bg)] disabled:opacity-40">
              <Upload className="h-4 w-4" aria-hidden />
              Izberi datoteke
              <input
                type="file"
                multiple
                className="hidden"
                disabled={busy || !dbConfigured}
                onChange={(e) => {
                  const fl = e.target.files;
                  e.target.value = "";
                  if (fl?.length) void uploadFiles(fl);
                }}
              />
            </label>
            <span className="text-[var(--vo-muted)]">ali povleci sem ↓</span>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-10 text-center text-sm transition-colors ${
            dragOver
              ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] text-[var(--vo-accent)]"
              : "border-[var(--vo-border)] bg-[var(--vo-surface)] text-[var(--vo-muted)]"
          }`}
        >
          Spusti dokumente ali slike sem (do 25 MB na datoteko).
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
              <tr>
                <th className="px-3 py-2">Mapa</th>
                <th className="px-3 py-2">Datoteka</th>
                <th className="px-3 py-2">Velikost</th>
                <th className="px-3 py-2">Naloženo</th>
                <th className="px-3 py-2 text-right">Akciije</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-[var(--vo-border)]">
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
                      Izbriši
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--vo-muted)]">Ni dokumentov.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

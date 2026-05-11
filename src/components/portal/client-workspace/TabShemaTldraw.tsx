"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Tldraw } from "@tldraw/tldraw";
import type { Editor } from "@tldraw/tldraw";
import type { TLStoreSnapshot } from "@tldraw/tldraw";
import { toRichText } from "@tldraw/tldraw";
import type { CameraDevice, ClientTopologyState } from "@/lib/types";

type Props = {
  clientId: string;
  topo: ClientTopologyState;
  setTopo: React.Dispatch<React.SetStateAction<ClientTopologyState>>;
  cameras: CameraDevice[];
};

function cameraLabel(c: CameraDevice) {
  return `KAMERA ${c.tag ? `${c.tag} ` : ""}${c.name}`.trim();
}

function cameraBadge(c: CameraDevice) {
  return c.tag?.trim() ? `#${c.tag.trim()}` : "KAMERA";
}

function isValidTldrawSnapshot(input: unknown): input is TLStoreSnapshot {
  if (!input || typeof input !== "object") return false;
  const x = input as Record<string, unknown>;
  return !!x.store && typeof x.store === "object" && !!x.schema && typeof x.schema === "object";
}

function sanitizeSnapshot(input: TLStoreSnapshot): TLStoreSnapshot {
  const rawStore = (input as { store: Record<string, unknown> }).store;
  const store: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawStore)) {
    if (!v || typeof v !== "object") {
      store[k] = v;
      continue;
    }
    const rec = v as Record<string, unknown>;
    if (rec.typeName === "shape" && rec.type === "text" && rec.props && typeof rec.props === "object") {
      const props = { ...(rec.props as Record<string, unknown>) };
      if (typeof props.text === "string" && props.richText === undefined) {
        props.richText = toRichText(props.text);
      }
      delete props.text;
      store[k] = { ...rec, props };
      continue;
    }
    store[k] = rec;
  }
  return { ...input, store } as TLStoreSnapshot;
}

export function TabShemaTldraw({ clientId, topo, setTopo, cameras }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [tick, setTick] = useState(0);
  const seededIdsRef = useRef<Set<string>>(new Set());
  const snapshotRef = useRef<unknown>(topo.tldrawSnapshot);

  const snapshot = useMemo<TLStoreSnapshot | undefined>(() => {
    if (!isValidTldrawSnapshot(topo.tldrawSnapshot)) return undefined;
    return sanitizeSnapshot(topo.tldrawSnapshot);
  }, [topo.tldrawSnapshot]);
  const initialSnapshotRef = useRef<TLStoreSnapshot | undefined>(snapshot);

  useEffect(() => {
    snapshotRef.current = topo.tldrawSnapshot;
  }, [topo.tldrawSnapshot]);

  useEffect(() => {
    if (topo.tldrawSnapshot === undefined) return;
    if (isValidTldrawSnapshot(topo.tldrawSnapshot)) return;
    // Starejši / pokvarjen zapis ne sme sesuti editorja.
    setTopo((prev) => ({ ...prev, tldrawSnapshot: undefined }));
  }, [setTopo, topo.tldrawSnapshot]);

  useEffect(() => {
    // Pri menjavi stranke inicializiramo enkratni začetni snapshot.
    const raw = snapshotRef.current;
    initialSnapshotRef.current = isValidTldrawSnapshot(raw)
      ? sanitizeSnapshot(raw)
      : undefined;
    seededIdsRef.current = new Set();
  }, [clientId]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 1200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editor.getSnapshot();
    setTopo((prev) => ({ ...prev, schemaEditorMode: "tldraw", tldrawSnapshot: next }));
  }, [tick, setTopo]);

  const addCamera = (camera: CameraDevice) => {
    const editor = editorRef.current;
    if (!editor) return;
    const idx = seededIdsRef.current.size;
    const x = 160 + (idx % 5) * 240;
    const y = 140 + Math.floor(idx / 5) * 110;
    const text = `📷 ${cameraBadge(camera)}\n${camera.name}\n${camera.ip || ""}`;
    editor.createShapes([
      {
        type: "text",
        x,
        y,
        props: { richText: toRichText(text) },
      } as never,
    ]);
    seededIdsRef.current.add(camera.id);
  };

  const addAllCameras = () => {
    cameras.forEach((c) => {
      if (!seededIdsRef.current.has(c.id)) addCamera(c);
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
        <p className="font-semibold text-[var(--vo-fg)]">tldraw shema</p>
        <p className="mt-1 text-[var(--vo-muted)]">
          Uporabi orodja levo zgoraj za risanje. Kamere lahko dodaš po eni ali vse naenkrat.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addAllCameras}
            className="rounded border border-[var(--vo-accent)] bg-[var(--vo-accent-muted)] px-2 py-1 text-[var(--vo-accent)]"
          >
            + Dodaj vse kamere
          </button>
          <span className="text-[var(--vo-muted)]">({cameras.length} kamer)</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {cameras.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => addCamera(c)}
              className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)] hover:border-[var(--vo-accent)] hover:text-[var(--vo-fg)]"
            >
              📷 {c.tag ? `${c.tag} ` : ""}
              {c.name || cameraLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
        <p className="font-semibold text-[var(--vo-fg)]">Ozadje tlorisa</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="url"
            placeholder="https://.../tloris.jpg"
            value={topo.planBackgroundUrl ?? ""}
            onChange={(e) =>
              setTopo((t) => ({
                ...t,
                planBackgroundUrl: e.target.value.trim() || undefined,
                planBackgroundDataUrl: e.target.value.trim() ? undefined : t.planBackgroundDataUrl,
              }))
            }
            className="min-w-[260px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1 text-[var(--vo-fg)]"
          />
          <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)]">
            Naloži sliko
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 2_400_000) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const url = typeof reader.result === "string" ? reader.result : "";
                  if (!url.startsWith("data:")) return;
                  setTopo((t) => ({
                    ...t,
                    planBackgroundDataUrl: url,
                    planBackgroundUrl: undefined,
                  }));
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <button
            type="button"
            className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)] hover:text-[var(--vo-danger)]"
            onClick={() =>
              setTopo((t) => ({ ...t, planBackgroundUrl: undefined, planBackgroundDataUrl: undefined }))
            }
          >
            Odstrani ozadje
          </button>
        </div>
      </div>

      <div className="relative h-[70vh] min-h-[520px] overflow-hidden rounded-xl border border-[var(--vo-border)] bg-white">
        {(topo.planBackgroundDataUrl ?? topo.planBackgroundUrl) ? (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.2]"
            style={{
              backgroundImage: `url(${topo.planBackgroundDataUrl ?? topo.planBackgroundUrl})`,
            }}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0">
          <Tldraw
            key={`tldraw-${clientId}`}
            snapshot={initialSnapshotRef.current}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
      </div>
    </div>
  );
}

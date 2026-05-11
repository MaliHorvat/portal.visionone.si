"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Tldraw } from "@tldraw/tldraw";
import type { Editor } from "@tldraw/tldraw";
import type { TLStoreSnapshot } from "@tldraw/tldraw";
import type { CameraDevice, ClientTopologyState } from "@/lib/types";

type Props = {
  topo: ClientTopologyState;
  setTopo: React.Dispatch<React.SetStateAction<ClientTopologyState>>;
  cameras: CameraDevice[];
};

function cameraLabel(c: CameraDevice) {
  return `KAMERA ${c.tag ? `${c.tag} ` : ""}${c.name}`.trim();
}

export function TabShemaTldraw({ topo, setTopo, cameras }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const [tick, setTick] = useState(0);
  const seededIdsRef = useRef<Set<string>>(new Set());

  const snapshot = useMemo<TLStoreSnapshot | undefined>(() => {
    return topo.tldrawSnapshot && typeof topo.tldrawSnapshot === "object"
      ? (topo.tldrawSnapshot as TLStoreSnapshot)
      : undefined;
  }, [topo.tldrawSnapshot]);

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
    const text = `${cameraLabel(camera)}\n${camera.ip || ""}`;
    editor.createShapes([
      {
        type: "text",
        x,
        y,
        props: { text },
      } as never,
    ]);
    seededIdsRef.current.add(camera.id);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
        <p className="font-semibold text-[var(--vo-fg)]">tldraw shema</p>
        <p className="mt-1 text-[var(--vo-muted)]">
          Uporabi orodja levo zgoraj za risanje. Spodaj lahko dodaš kamere kot besedilne oznake.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {cameras.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => addCamera(c)}
              className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
            >
              + {c.tag ? `${c.tag} ` : ""}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[70vh] min-h-[520px] overflow-hidden rounded-xl border border-[var(--vo-border)] bg-white">
        <Tldraw
          snapshot={snapshot}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}

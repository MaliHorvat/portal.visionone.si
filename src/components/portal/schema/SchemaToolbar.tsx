"use client";

import {
  AlignCenterHorizontal,
  Copy,
  Download,
  FileJson,
  FileText,
  Focus,
  Layers,
  Maximize2,
  Printer,
  Redo2,
  Ruler,
  Undo2,
  Hash,
  ClipboardPaste,
  Image,
  Map,
} from "lucide-react";

type Props = {
  editMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  measureMode: boolean;
  showLayers: boolean;
  fullscreen: boolean;
  selectedNodeId: string | null;
  onToggleEdit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  dbConfigured: boolean;
  onExportBom: () => void;
  onExportCables: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onAutoNumber: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onMeasure: () => void;
  onToggleLayers: () => void;
  onFullscreen: () => void;
  onFitView: () => void;
  onAlign: (mode: "left" | "h-center") => void;
  onExportPng: () => void;
  viewMode: "floor" | "map";
  onViewMode: (mode: "floor" | "map") => void;
};

export function SchemaToolbar(p: Props) {
  const btn =
    "inline-flex items-center gap-1 rounded border border-[var(--vo-border)] px-2 py-1 text-[10px] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)] hover:text-[var(--vo-fg)] disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-1.5">
      <button type="button" onClick={p.onToggleEdit} className={`${btn} ${p.editMode ? "border-[var(--vo-accent)] text-[var(--vo-accent)]" : ""}`}>
        {p.editMode ? "Urejanje" : "Pregled"}
      </button>
      {p.isDirty ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">Neshranjeno</span> : null}
      <button type="button" className={btn} onClick={p.onUndo} disabled={!p.canUndo}>
        <Undo2 className="h-3 w-3" /> Razveljavi
      </button>
      <button type="button" className={btn} onClick={p.onRedo} disabled={!p.canRedo}>
        <Redo2 className="h-3 w-3" /> Uveljavi
      </button>
      <button type="button" className={`${btn} bg-[var(--vo-accent)] text-white hover:text-white`} onClick={p.onSave} disabled={!p.dbConfigured}>
        Shrani
      </button>
      <span className="mx-1 h-4 w-px bg-[var(--vo-border)]" />
      <button type="button" className={btn} onClick={p.onExportBom} title="BOM CSV">
        <FileText className="h-3 w-3" /> BOM
      </button>
      <button type="button" className={btn} onClick={p.onExportCables} title="Kabelski razrez">
        <Download className="h-3 w-3" /> Kabli
      </button>
      <button type="button" className={btn} onClick={p.onExportPdf}>
        <FileText className="h-3 w-3" /> PDF
      </button>
      <button type="button" className={btn} onClick={p.onPrint}>
        <Printer className="h-3 w-3" /> Tisk
      </button>
      <button type="button" className={btn} onClick={p.onExportJson}>
        <FileJson className="h-3 w-3" /> JSON
      </button>
      <button type="button" className={btn} onClick={p.onImportJson}>
        Uvozi
      </button>
      <span className="mx-1 h-4 w-px bg-[var(--vo-border)]" />
      <button
        type="button"
        className={`${btn} ${p.viewMode === "floor" ? "border-[var(--vo-accent)] text-[var(--vo-accent)]" : ""}`}
        onClick={() => p.onViewMode("floor")}
      >
        Tloris
      </button>
      <button
        type="button"
        className={`${btn} ${p.viewMode === "map" ? "border-[var(--vo-accent)] text-[var(--vo-accent)]" : ""}`}
        onClick={() => p.onViewMode("map")}
      >
        <Map className="h-3 w-3" /> Zemljevid
      </button>
      <button type="button" className={btn} onClick={p.onExportPng} disabled={p.viewMode !== "floor"} title="PNG platna">
        <Image className="h-3 w-3" /> PNG
      </button>
      <span className="mx-1 h-4 w-px bg-[var(--vo-border)]" />
      <button type="button" className={btn} onClick={p.onAutoNumber} disabled={!p.editMode}>
        <Hash className="h-3 w-3" /> Št. kamer
      </button>
      <button type="button" className={btn} onClick={p.onDuplicate} disabled={!p.selectedNodeId || !p.editMode}>
        <Copy className="h-3 w-3" /> Podvoji
      </button>
      <button type="button" className={btn} onClick={p.onCopy} disabled={!p.selectedNodeId}>
        Kopiraj
      </button>
      <button type="button" className={btn} onClick={p.onPaste} disabled={!p.editMode}>
        <ClipboardPaste className="h-3 w-3" /> Prilepi
      </button>
      <button type="button" className={`${btn} ${p.measureMode ? "border-[var(--vo-accent)] text-[var(--vo-accent)]" : ""}`} onClick={p.onMeasure}>
        <Ruler className="h-3 w-3" /> Meritev
      </button>
      <button type="button" className={btn} onClick={() => p.onAlign("left")} disabled={!p.editMode}>
        <AlignCenterHorizontal className="h-3 w-3" /> Poravnaj
      </button>
      <button type="button" className={`${btn} ${p.showLayers ? "border-[var(--vo-accent)]" : ""}`} onClick={p.onToggleLayers}>
        <Layers className="h-3 w-3" />
      </button>
      <button type="button" className={btn} onClick={p.onFitView}>
        <Focus className="h-3 w-3" />
      </button>
      <button type="button" className={btn} onClick={p.onFullscreen}>
        <Maximize2 className="h-3 w-3" />
      </button>
    </div>
  );
}

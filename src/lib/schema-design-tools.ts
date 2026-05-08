import type { ClientDetail, FloorPlanPathEntry, TopologyCanvasNode } from "@/lib/types";

export function snapCoord(value: number, gridPx: number | undefined): number {
  const g = gridPx && gridPx > 0 ? gridPx : 0;
  if (!g) return Math.round(value);
  return Math.round(value / g) * g;
}

/** Dolžina črte na platnu v px (kosinusna razdalja po segmentih). */
export function polylineLengthPx(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

export function sumCableLengthM(paths: FloorPlanPathEntry[] | undefined, metersPerPx: number | undefined): number {
  if (!paths?.length || !metersPerPx || metersPerPx <= 0) return 0;
  let px = 0;
  for (const p of paths) {
    if (p.kind !== "cable") continue;
    px += polylineLengthPx(p.points);
  }
  return Math.round(px * metersPerPx * 100) / 100;
}

/** CSV iz naprav na platnu (kot poenostavljen kos BOM iz načrta). */
export function buildDesignBomCsv(client: ClientDetail, nodes: TopologyCanvasNode[]): string {
  const sep = ";";
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines: string[][] = [["Tip", "ID", "Ime", "Model", "IP_naslov", "Opomba"]];
  for (const n of nodes) {
    const ref = n.deviceRef;
    if (!ref) continue;
    if (ref.kind === "camera") {
      const d = client.cameras.find((c) => c.id === ref.id);
      if (d) lines.push(["Kamera", d.id, d.name, d.model, d.ip, (d.comment ?? "").replace(/\r?\n/g, " ")]);
      continue;
    }
    if (ref.kind === "recorder") {
      const d = client.nvrs.find((r) => r.id === ref.id);
      if (d) lines.push(["Snemalnik", d.id, d.name, d.model, d.ip, (d.comment ?? "").replace(/\r?\n/g, " ")]);
      continue;
    }
    if (ref.kind === "switch") {
      const d = client.switches.find((s) => s.id === ref.id);
      if (d)
        lines.push([
          "Switch",
          d.id,
          d.name,
          d.model,
          d.ip,
          `${d.comment ?? ""}${d.ports ? ` | porti:${d.ports}` : ""}`.trim(),
        ]);
      continue;
    }
    if (ref.kind === "disk") {
      const d = client.disks.find((x) => x.id === ref.id);
      if (d)
        lines.push(["Disk", d.id, d.label, d.model ?? "", "", (d.comment ?? "").replace(/\r?\n/g, " ")]);
    }
  }
  const header = "\ufeff";
  return (
    header +
    lines.map((row) => row.map((cell) => esc(cell)).join(sep)).join("\r\n")
  );
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lok „objektiva“ in smerni kot (rad) za risanje stožcev / lokov. */
export function cameraLensVertex(iconCx: number, iconCy: number, rotationDeg: number, lensForwardPx = 18) {
  const br = ((rotationDeg ?? 0) - 90) * (Math.PI / 180);
  return {
    vx: iconCx + lensForwardPx * Math.cos(br),
    vy: iconCy + lensForwardPx * Math.sin(br),
    br,
  };
}

/** Lok od a1 do a2 (rad) s polmerom r. */
export function svgArcOpen(cx: number, cy: number, r: number, a1: number, a2: number): string {
  if (r <= 0) return "";
  const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

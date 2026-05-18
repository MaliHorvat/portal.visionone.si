import type { ClientDetail, ClientTopologyState, TopologyCanvasNode } from "@/lib/types";
import { isCameraIcon, type SchemaIconKey } from "@/lib/schema-icons";
import { resolveDisplayName, resolveIp } from "@/lib/schema-node-utils";
import { buildDesignBomCsv, downloadTextFile, polylineLengthPx, sumCableLengthM } from "@/lib/schema-design-tools";

export const DEFAULT_LAYER_VISIBILITY: NonNullable<ClientTopologyState["layerVisibility"]> = {
  background: true,
  walls: true,
  cables: true,
  fov: true,
  devices: true,
  edges: true,
};

export function mergeLayerVisibility(
  lv: ClientTopologyState["layerVisibility"] | undefined,
): NonNullable<ClientTopologyState["layerVisibility"]> {
  return { ...DEFAULT_LAYER_VISIBILITY, ...lv };
}

export function topologySnapshot(t: ClientTopologyState): string {
  return JSON.stringify(t);
}

export function cloneTopology(t: ClientTopologyState): ClientTopologyState {
  return JSON.parse(topologySnapshot(t)) as ClientTopologyState;
}

export function buildCableScheduleCsv(
  topo: ClientTopologyState,
  client: ClientDetail,
): string {
  const sep = ";";
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const mpp = topo.planCalibration?.metersPerPx ?? 0;
  const rows: string[][] = [["#", "Tip_kabla", "Dolzina_m", "Tocka_A", "Točka_B"]];
  let i = 0;
  for (const path of topo.floorPlanPaths ?? []) {
    if (path.kind !== "cable") continue;
    i += 1;
    const lenM = mpp > 0 ? Math.round(polylineLengthPx(path.points) * mpp * 100) / 100 : 0;
    const a = path.points[0];
    const b = path.points[path.points.length - 1];
    rows.push([
      String(i),
      path.cableType ?? "Cat6",
      String(lenM),
      a ? `${Math.round(a.x)},${Math.round(a.y)}` : "",
      b ? `${Math.round(b.x)},${Math.round(b.y)}` : "",
    ]);
  }
  for (const e of topo.edges) {
    i += 1;
    const from = topo.nodes.find((n) => n.id === e.from);
    const to = topo.nodes.find((n) => n.id === e.to);
    rows.push([
      String(i),
      e.cableType ?? e.label ?? "Povezava",
      "",
      from ? resolveDisplayName(from, client) : e.from,
      to ? resolveDisplayName(to, client) : e.to,
    ]);
  }
  return "\ufeff" + rows.map((r) => r.map(esc).join(sep)).join("\r\n");
}

export function autoNumberCameraBadges(topo: ClientTopologyState): ClientTopologyState {
  let n = 1;
  const nodes = topo.nodes.map((node) => {
    const key = (node.iconKey ?? "") as SchemaIconKey;
    if (!isCameraIcon(key) && node.deviceRef?.kind !== "camera") return node;
    return { ...node, cameraPlan: { ...node.cameraPlan, badge: n++ } };
  });
  return { ...topo, nodes };
}

export function duplicateNodeInTopo(topo: ClientTopologyState, nodeId: string): ClientTopologyState {
  const src = topo.nodes.find((n) => n.id === nodeId);
  if (!src) return topo;
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `n-${Date.now()}`;
  const copy: TopologyCanvasNode = {
    ...JSON.parse(JSON.stringify(src)),
    id,
    x: src.x + 24,
    y: src.y + 24,
    deviceRef: undefined,
    label: `${src.label} (kopija)`,
  };
  return { ...topo, nodes: [...topo.nodes, copy] };
}

export function alignNodes(
  topo: ClientTopologyState,
  ids: string[],
  mode: "left" | "right" | "top" | "bottom" | "h-center" | "v-center",
): ClientTopologyState {
  const selected = topo.nodes.filter((n) => ids.includes(n.id));
  if (selected.length < 2) return topo;
  const xs = selected.map((n) => n.x);
  const ys = selected.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const nodes = topo.nodes.map((n) => {
    if (!ids.includes(n.id)) return n;
    if (mode === "left") return { ...n, x: minX };
    if (mode === "right") return { ...n, x: maxX };
    if (mode === "top") return { ...n, y: minY };
    if (mode === "bottom") return { ...n, y: maxY };
    if (mode === "h-center") return { ...n, x: midX };
    if (mode === "v-center") return { ...n, y: midY };
    return n;
  });
  return { ...topo, nodes };
}

export async function exportShemaPdf(
  client: ClientDetail,
  topo: ClientTopologyState,
  cableTotalM: number,
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Načrt — ${client.name}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Naslov: ${client.address || "—"}`, 14, 24);
  if (topo.planNotes) {
    const lines = doc.splitTextToSize(`Opombe: ${topo.planNotes}`, 180);
    doc.text(lines, 14, 32);
  }
  const body = topo.nodes.map((n, i) => [
    String(i + 1),
    n.iconKey ?? "",
    resolveDisplayName(n, client),
    resolveIp(n, client),
    n.deviceRef?.kind ?? "simbol",
  ]);
  autoTable(doc, {
    startY: topo.planNotes ? 42 : 30,
    head: [["#", "Ikona", "Ime", "IP", "Vir"]],
    body,
    styles: { fontSize: 8 },
  });
  const docExt = doc as unknown as { lastAutoTable?: { finalY: number } };
  let y = (docExt.lastAutoTable?.finalY ?? 40) + 8;
  doc.text(`Skupaj kabli (ocena): ${cableTotalM.toFixed(2)} m`, 14, y);
  y += 6;
  doc.text(`Vozlisc: ${topo.nodes.length} · Povezav: ${topo.edges.length}`, 14, y);
  doc.save(`nacrt-${client.slug ?? client.id}.pdf`);
}

export function openShemaPrintReport(client: ClientDetail, topo: ClientTopologyState, cableTotalM: number) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return;
  const rows = topo.nodes
    .map(
      (n, i) =>
        `<tr><td>${i + 1}</td><td>${n.iconKey ?? ""}</td><td>${resolveDisplayName(n, client)}</td><td>${resolveIp(n, client)}</td></tr>`,
    )
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Načrt</title>
<style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#f4f4f4}</style></head>
<body><h1>Načrt — ${client.name}</h1><p>${client.address}</p>
${topo.planNotes ? `<p><b>Opombe:</b> ${topo.planNotes}</p>` : ""}
<p>Kabli: <b>${cableTotalM.toFixed(2)} m</b> · Naprav: ${topo.nodes.length}</p>
<table><thead><tr><th>#</th><th>Ikona</th><th>Ime</th><th>IP</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.print()</script></body></html>`);
  w.document.close();
}

export function exportTopologyJson(clientSlug: string, topo: ClientTopologyState) {
  downloadTextFile(
    `nacrt-${clientSlug}.json`,
    JSON.stringify(topo, null, 2),
    "application/json;charset=utf-8",
  );
}

export function importTopologyFromJson(text: string): ClientTopologyState | null {
  try {
    const o = JSON.parse(text) as ClientTopologyState;
    if (!o || !Array.isArray(o.nodes)) return null;
    return o;
  } catch {
    return null;
  }
}

export function buildLegendHtml(topo: ClientTopologyState): string {
  const used = new Map<string, number>();
  for (const n of topo.nodes) {
    const k = n.iconKey ?? "generic";
    used.set(k, (used.get(k) ?? 0) + 1);
  }
  return [...used.entries()].map(([k, c]) => `<li>${k}: ${c}×</li>`).join("");
}

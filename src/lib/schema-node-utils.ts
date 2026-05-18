import { catalogEntry } from "@/lib/schema-icon-catalog";
import {
  defaultIconForDeviceKind,
  isCameraIcon,
  parseSchemaIconKey,
  type SchemaIconKey,
} from "@/lib/schema-icons";
import type { ClientDetail, TopologyCanvasNode, TopologyDeviceKind } from "@/lib/types";

export function resolveIconKey(node: TopologyCanvasNode): SchemaIconKey {
  return parseSchemaIconKey(node.iconKey) ?? (node.deviceRef ? defaultIconForDeviceKind(node.deviceRef.kind) : "generic");
}

export function resolveIconColor(node: TopologyCanvasNode): string {
  if (node.appearance?.iconColor) return node.appearance.iconColor;
  return catalogEntry(resolveIconKey(node)).defaultColor;
}

export function resolveIconSize(node: TopologyCanvasNode, globalSize?: number): number {
  return node.appearance?.iconSizePx ?? globalSize ?? 40;
}

export function resolveDisplayName(node: TopologyCanvasNode, client: ClientDetail): string {
  if (node.appearance?.displayName?.trim()) return node.appearance.displayName.trim();
  if (node.deviceRef) {
    const { kind, id } = node.deviceRef;
    if (kind === "camera") return client.cameras.find((c) => c.id === id)?.name ?? node.label;
    if (kind === "recorder") return client.nvrs.find((r) => r.id === id)?.name ?? node.label;
    if (kind === "switch") return client.switches.find((s) => s.id === id)?.name ?? node.label;
    if (kind === "disk") return client.disks.find((d) => d.id === id)?.label ?? node.label;
  }
  return node.label;
}

export function resolveIp(node: TopologyCanvasNode, client: ClientDetail): string {
  if (node.planMeta?.ip) return node.planMeta.ip;
  if (!node.deviceRef) return "";
  const { kind, id } = node.deviceRef;
  if (kind === "camera") return client.cameras.find((c) => c.id === id)?.ip ?? "";
  if (kind === "recorder") return client.nvrs.find((r) => r.id === id)?.ip ?? "";
  if (kind === "switch") return client.switches.find((s) => s.id === id)?.ip ?? "";
  if (kind === "disk") return client.disks.find((d) => d.id === id)?.ip ?? "";
  return "";
}

export function resolveModel(node: TopologyCanvasNode, client: ClientDetail): string {
  if (node.planMeta?.model) return node.planMeta.model;
  if (!node.deviceRef) return "";
  const { kind, id } = node.deviceRef;
  if (kind === "camera") return client.cameras.find((c) => c.id === id)?.model ?? "";
  if (kind === "recorder") return client.nvrs.find((r) => r.id === id)?.model ?? "";
  if (kind === "switch") return client.switches.find((s) => s.id === id)?.model ?? "";
  if (kind === "disk") return client.disks.find((d) => d.id === id)?.model ?? "";
  return "";
}

export function nodeShowsFov(node: TopologyCanvasNode): boolean {
  const key = resolveIconKey(node);
  if (!isCameraIcon(key) && node.deviceRef?.kind !== "camera") return false;
  return node.appearance?.showFov !== false;
}

export function deviceKindLabel(kind: TopologyDeviceKind): string {
  switch (kind) {
    case "camera":
      return "Kamera";
    case "recorder":
      return "Snemalnik";
    case "switch":
      return "Switch";
    case "disk":
      return "Disk";
    default:
      return "Naprava";
  }
}

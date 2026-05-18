"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Settings, Globe, Paintbrush, Link2, Image } from "lucide-react";
import { DecimalInput } from "@/components/portal/DecimalInput";
import { catalogEntry, ICON_CATALOG } from "./schema-icon-catalog";
import { SchemaIcon } from "./SchemaIcon";
import {
  SCHEMA_FOV_COLORS,
  type SchemaIconKey,
  type SchemaNodeAppearance,
} from "@/lib/schema-icons";
import {
  deviceKindLabel,
  resolveDisplayName,
  resolveIconColor,
  resolveIconKey,
  resolveIp,
  resolveModel,
} from "@/lib/schema-node-utils";
import type { CameraPlanOverlay, ClientDetail, TopologyCanvasEdge, TopologyCanvasNode } from "@/lib/types";

type TabId = "settings" | "network" | "appearance" | "connections" | "photos";

type Props = {
  client: ClientDetail;
  clientId: string;
  dbConfigured: boolean;
  node: TopologyCanvasNode;
  edges: TopologyCanvasEdge[];
  allNodes: TopologyCanvasNode[];
  status: "online" | "offline" | "unknown";
  onClose: () => void;
  onPatchNode: (patch: Partial<TopologyCanvasNode>) => void;
  onPatchCameraPlan: (patch: Partial<CameraPlanOverlay>) => void;
  onReloadClient: () => Promise<void>;
  globalIconSize: number;
  onGlobalIconSize: (px: number) => void;
};

const inputCls =
  "mt-0.5 w-full rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1.5 text-[var(--vo-fg)]";

export function SchemaDeviceInspector({
  client,
  clientId,
  dbConfigured,
  node,
  edges,
  allNodes,
  status,
  onClose,
  onPatchNode,
  onPatchCameraPlan,
  onReloadClient,
  globalIconSize,
  onGlobalIconSize,
}: Props) {
  const [tab, setTab] = useState<TabId>("settings");
  const [busy, setBusy] = useState(false);
  const iconKey = resolveIconKey(node);
  const isCamera = iconKey.startsWith("camera-") || node.deviceRef?.kind === "camera";
  const title = isCamera ? "Kamera" : node.deviceRef ? deviceKindLabel(node.deviceRef.kind) : catalogEntry(iconKey).label;

  const [label, setLabel] = useState(node.label);
  const [displayName, setDisplayName] = useState(node.appearance?.displayName ?? "");
  const [ip, setIp] = useState(resolveIp(node, client));
  const [model, setModel] = useState(resolveModel(node, client));
  const [manufacturer, setManufacturer] = useState(node.planMeta?.manufacturer ?? "");
  const [comment, setComment] = useState(node.planMeta?.comment ?? "");
  const [floor, setFloor] = useState(node.planMeta?.floor ?? "");
  const [mac, setMac] = useState(node.planMeta?.mac ?? "");
  const [ports, setPorts] = useState(String(node.planMeta?.ports ?? ""));
  const [rtspUser, setRtspUser] = useState(node.planMeta?.rtspUser ?? "");
  const [rtspPass, setRtspPass] = useState(node.planMeta?.rtspPass ?? "");
  const [photoBefore, setPhotoBefore] = useState(node.planMeta?.photoBefore ?? "");
  const [photoAfter, setPhotoAfter] = useState(node.planMeta?.photoAfter ?? "");
  const [photoNvr, setPhotoNvr] = useState(node.planMeta?.photoNvr ?? "");

  useEffect(() => {
    setLabel(node.label);
    setDisplayName(node.appearance?.displayName ?? "");
    setIp(resolveIp(node, client));
    setModel(resolveModel(node, client));
    setManufacturer(node.planMeta?.manufacturer ?? "");
    setComment(node.planMeta?.comment ?? "");
    setFloor(node.planMeta?.floor ?? "");
    setMac(node.planMeta?.mac ?? "");
    setPorts(String(node.planMeta?.ports ?? ""));
    setRtspUser(node.planMeta?.rtspUser ?? "");
    setRtspPass(node.planMeta?.rtspPass ?? "");
    setPhotoBefore(node.planMeta?.photoBefore ?? "");
    setPhotoAfter(node.planMeta?.photoAfter ?? "");
    setPhotoNvr(node.planMeta?.photoNvr ?? "");
  }, [node.id, node, client]);

  const loadPhoto = (field: "photoBefore" | "photoAfter" | "photoNvr", file: File) => {
    if (file.size > 1_800_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url.startsWith("data:")) return;
      if (field === "photoBefore") setPhotoBefore(url);
      if (field === "photoAfter") setPhotoAfter(url);
      if (field === "photoNvr") setPhotoNvr(url);
    };
    reader.readAsDataURL(file);
  };

  const patchAppearance = useCallback(
    (patch: Partial<SchemaNodeAppearance>) => {
      onPatchNode({ appearance: { ...node.appearance, ...patch } });
    },
    [node.appearance, onPatchNode],
  );

  const saveInventoryDevice = useCallback(async () => {
    if (!dbConfigured || !node.deviceRef) return;
    setBusy(true);
    const { kind, id } = node.deviceRef;
    const body: Record<string, string | number> = {};
    if (kind === "camera") {
      if (label.trim()) body.name = label.trim();
      if (ip.trim()) body.ip = ip.trim();
      if (model.trim()) body.model = model.trim();
      if (comment.trim()) body.comment = comment.trim();
      if (rtspUser.trim()) body.rtspUser = rtspUser.trim();
      if (rtspPass.trim()) body.rtspPass = rtspPass.trim();
    } else if (kind === "recorder" || kind === "switch") {
      if (label.trim()) body.name = label.trim();
      if (ip.trim()) body.ip = ip.trim();
      if (model.trim()) body.model = model.trim();
      if (comment.trim()) body.comment = comment.trim();
      if (kind === "switch" && ports.trim()) body.ports = Number(ports) || 0;
    } else if (kind === "disk") {
      if (label.trim()) body.label = label.trim();
      if (model.trim()) body.model = model.trim();
      if (comment.trim()) body.comment = comment.trim();
    }
    const path =
      kind === "camera"
        ? `cameras/${id}`
        : kind === "recorder"
          ? `recorders/${id}`
          : kind === "switch"
            ? `switches/${id}`
            : `disks/${id}`;
    const r = await fetch(`/api/clients/${clientId}/${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) return;
    onPatchNode({
      label: label.trim() || node.label,
      planMeta: {
        ...node.planMeta,
        ip: ip.trim() || undefined,
        model: model.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        comment: comment.trim() || undefined,
        floor: floor.trim() || undefined,
        mac: mac.trim() || undefined,
        ports: ports.trim() ? Number(ports) : undefined,
        rtspUser: rtspUser.trim() || undefined,
        rtspPass: rtspPass.trim() || undefined,
      },
    });
    await onReloadClient();
  }, [
    clientId,
    comment,
    dbConfigured,
    floor,
    ip,
    label,
    mac,
    manufacturer,
    model,
    node,
    onPatchNode,
    onReloadClient,
    ports,
    rtspPass,
    rtspUser,
  ]);

  const savePlanOnly = useCallback(() => {
    onPatchNode({
      label: label.trim() || node.label,
      appearance: {
        ...node.appearance,
        displayName: displayName.trim() || undefined,
      },
      planMeta: {
        ip: ip.trim() || undefined,
        model: model.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        comment: comment.trim() || undefined,
        floor: floor.trim() || undefined,
        mac: mac.trim() || undefined,
        ports: ports.trim() ? Number(ports) : undefined,
        rtspUser: rtspUser.trim() || undefined,
        rtspPass: rtspPass.trim() || undefined,
        photoBefore: photoBefore || undefined,
        photoAfter: photoAfter || undefined,
        photoNvr: photoNvr || undefined,
      },
    });
  }, [
    photoAfter,
    photoBefore,
    photoNvr,
    comment,
    displayName,
    floor,
    ip,
    label,
    mac,
    manufacturer,
    model,
    node,
    onPatchNode,
    ports,
    rtspPass,
    rtspUser,
  ]);

  const linkedEdges = edges.filter((e) => e.from === node.id || e.to === node.id);
  const cp = node.cameraPlan;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface-2)] shadow-lg lg:w-80 xl:w-[340px]">
      <header className="flex items-center gap-2 border-b border-[var(--vo-border)] px-3 py-2.5">
        <SchemaIcon iconKey={iconKey} color={resolveIconColor(node)} size={36} status={status} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--vo-fg)]">{title}</h3>
          <p className="truncate text-[10px] text-[var(--vo-muted)]">{resolveDisplayName(node, client)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface)]">
          <X className="h-4 w-4" />
        </button>
      </header>

      <nav className="flex border-b border-[var(--vo-border)] text-[11px]">
        {(
          [
            ["settings", "Nastavitve", Settings],
            ["network", "Omrežje", Globe],
            ["appearance", "Videz", Paintbrush],
            ["connections", "Povezave", Link2],
            ["photos", "Fotke", Image],
          ] as const
        ).map(([id, lbl, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1 border-b-2 px-1 py-2 ${
              tab === id
                ? "border-[var(--vo-accent)] text-[var(--vo-accent)]"
                : "border-transparent text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {lbl}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-xs">
        {tab === "settings" ? (
          <div className="space-y-3">
            <label className="block text-[var(--vo-muted)]">
              Ime na shemi
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Proizvajalec
              <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Model
              <input value={model} onChange={(e) => setModel(e.target.value)} className={inputCls} />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Nadstropje / lokacija
              <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Klet, 1. nad." className={inputCls} />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Opombe
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </label>
            {isCamera ? (
              <div className="space-y-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] p-2">
                <p className="font-semibold text-[var(--vo-fg)]">Pokritost (FOV)</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[var(--vo-muted)]">
                    Št. oznake
                    <input
                      type="number"
                      value={cp?.badge ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onPatchCameraPlan(v === "" ? { badge: undefined } : { badge: Number(v) || 0 });
                      }}
                      className={inputCls}
                    />
                  </label>
                  <label className="text-[var(--vo-muted)]">
                    Višina (m)
                    <DecimalInput
                      value={cp?.mountHeightM ?? 0}
                      onChange={(n) => onPatchCameraPlan(n > 0 ? { mountHeightM: n } : { mountHeightM: undefined })}
                      className={inputCls}
                    />
                  </label>
                  <label className="text-[var(--vo-muted)]">
                    Naklon (°)
                    <DecimalInput
                      value={cp?.tiltDeg ?? 0}
                      onChange={(n) => onPatchCameraPlan(n > 0 ? { tiltDeg: n } : { tiltDeg: undefined })}
                      className={inputCls}
                    />
                  </label>
                  <label className="text-[var(--vo-muted)]">
                    FOV (°)
                    <DecimalInput
                      value={cp?.fovDeg ?? 0}
                      onChange={(n) => onPatchCameraPlan(n > 0 ? { fovDeg: n } : { fovDeg: undefined })}
                      className={inputCls}
                    />
                  </label>
                  <label className="text-[var(--vo-muted)]">
                    Doseg (px)
                    <DecimalInput
                      value={cp?.reachPx ?? 0}
                      onChange={(n) => onPatchCameraPlan(n > 0 ? { reachPx: n } : { reachPx: undefined })}
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[var(--vo-muted)]">
                  <input
                    type="checkbox"
                    checked={node.appearance?.showFov !== false}
                    onChange={(e) => patchAppearance({ showFov: e.target.checked })}
                  />
                  Prikaži polje vidnosti
                </label>
                <label className="flex items-center gap-2 text-[var(--vo-muted)]">
                  <input
                    type="checkbox"
                    checked={Boolean(cp?.showDoriZones)}
                    onChange={(e) => onPatchCameraPlan({ showDoriZones: e.target.checked ? true : undefined })}
                  />
                  DORI obroči (poenostavljeno)
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "network" ? (
          <div className="space-y-3">
            <label className="block text-[var(--vo-muted)]">
              IP naslov
              <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.10" className={inputCls} />
            </label>
            <label className="block text-[var(--vo-muted)]">
              MAC
              <input value={mac} onChange={(e) => setMac(e.target.value)} className={inputCls} />
            </label>
            {node.deviceRef?.kind === "switch" || iconKey === "switch" ? (
              <label className="block text-[var(--vo-muted)]">
                Število portov
                <input type="number" value={ports} onChange={(e) => setPorts(e.target.value)} className={inputCls} />
              </label>
            ) : null}
            {isCamera ? (
              <>
                <label className="block text-[var(--vo-muted)]">
                  RTSP uporabnik
                  <input value={rtspUser} onChange={(e) => setRtspUser(e.target.value)} className={inputCls} />
                </label>
                <label className="block text-[var(--vo-muted)]">
                  RTSP geslo
                  <input
                    type="password"
                    value={rtspPass}
                    onChange={(e) => setRtspPass(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </>
            ) : null}
            <p className="rounded bg-[var(--vo-surface)] px-2 py-1.5 text-[10px] text-[var(--vo-muted)]">
              Status:{" "}
              <span className={status === "online" ? "text-[var(--vo-ok)]" : "text-[var(--vo-danger)]"}>
                {status === "online" ? "Dosegljivo" : status === "offline" ? "Nedosegljivo" : "Neznano"}
              </span>
            </p>
          </div>
        ) : null}

        {tab === "appearance" ? (
          <div className="space-y-3">
            <label className="block text-[var(--vo-muted)]">
              Prikazno ime
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
            </label>
            <div>
              <p className="mb-1 text-[var(--vo-muted)]">Ikona</p>
              <div className="grid max-h-36 grid-cols-5 gap-1 overflow-y-auto rounded border border-[var(--vo-border)] p-1">
                {ICON_CATALOG.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    title={entry.label}
                    onClick={() =>
                      onPatchNode({
                        iconKey: entry.key,
                        appearance: {
                          ...node.appearance,
                          iconColor: entry.defaultColor,
                        },
                      })
                    }
                    className={`rounded p-0.5 ${iconKey === entry.key ? "ring-2 ring-[var(--vo-accent)]" : ""}`}
                  >
                    <SchemaIcon iconKey={entry.key} color={entry.defaultColor} size={26} status="unknown" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[var(--vo-muted)]">Barva ikone</p>
              <div className="flex flex-wrap gap-1.5">
                {SCHEMA_FOV_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchAppearance({ iconColor: c })}
                    className="h-6 w-6 rounded-full border border-white/20"
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={resolveIconColor(node)}
                  onChange={(e) => patchAppearance({ iconColor: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
                />
              </div>
            </div>
            {isCamera ? (
              <div>
                <p className="mb-1 text-[var(--vo-muted)]">Barva FOV</p>
                <div className="flex flex-wrap gap-1.5">
                  {SCHEMA_FOV_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => patchAppearance({ fovColor: c })}
                      className="h-6 w-6 rounded-full border border-white/20"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <label className="block text-[var(--vo-muted)]">
              Velikost ikone (px): {node.appearance?.iconSizePx ?? globalIconSize}
              <input
                type="range"
                min={24}
                max={64}
                value={node.appearance?.iconSizePx ?? globalIconSize}
                onChange={(e) => patchAppearance({ iconSizePx: Number(e.target.value) })}
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Splošna velikost vseh ikon: {globalIconSize}px
              <input
                type="range"
                min={24}
                max={56}
                value={globalIconSize}
                onChange={(e) => onGlobalIconSize(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-[var(--vo-muted)]">
              Kot (°): {node.rotationDeg ?? 0}
              <input
                type="range"
                min={0}
                max={359}
                value={node.rotationDeg ?? 0}
                onChange={(e) => onPatchNode({ rotationDeg: Number(e.target.value) })}
                className="mt-1 w-full"
              />
            </label>
          </div>
        ) : null}

        {tab === "connections" ? (
          <div className="space-y-2">
            <p className="text-[var(--vo-muted)]">Povezave na shemi (klik dveh naprav v načinu urejanja).</p>
            {linkedEdges.length === 0 ? (
              <p className="text-[var(--vo-muted)]">Ni povezav.</p>
            ) : (
              <ul className="space-y-1">
                {linkedEdges.map((e, i) => {
                  const otherId = e.from === node.id ? e.to : e.from;
                  const other = allNodes.find((n) => n.id === otherId);
                  return (
                    <li key={i} className="rounded border border-[var(--vo-border)] px-2 py-1.5">
                      {other ? resolveDisplayName(other, client) : otherId}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {tab === "photos" ? (
          <div className="space-y-3">
            {(
              [
                ["photoBefore", "Pred montažo", photoBefore, setPhotoBefore],
                ["photoAfter", "Po montaži", photoAfter, setPhotoAfter],
                ["photoNvr", "NVR / stenska", photoNvr, setPhotoNvr],
              ] as const
            ).map(([field, label, src, setSrc]) => (
              <div key={field} className="rounded-lg border border-[var(--vo-border)] p-2">
                <p className="mb-1 font-medium text-[var(--vo-fg)]">{label}</p>
                {src ? <img src={src} alt={label} className="mb-2 max-h-28 w-full rounded object-cover" /> : <p className="mb-2 text-[10px] text-[var(--vo-muted)]">Ni slike</p>}
                <label className="inline-flex cursor-pointer rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface)]">
                  Naloži
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) loadPhoto(field, f); }} />
                </label>
                {src ? <button type="button" className="ml-2 text-[10px] text-red-400" onClick={() => setSrc("")}>Odstrani</button> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="flex gap-2 border-t border-[var(--vo-border)] p-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => (node.deviceRef && dbConfigured ? void saveInventoryDevice() : savePlanOnly())}
          className="flex-1 rounded-lg bg-[var(--vo-accent)] py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Shranjujem…" : node.deviceRef ? "Shrani napravo" : "Shrani na shemi"}
        </button>
      </footer>
    </aside>
  );
}

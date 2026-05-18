"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Satellite, Map as MapIcon } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { SchemaMapViewState, TopologyCanvasNode } from "@/lib/types";
import { DEFAULT_MAP_CENTER, geocodeAddress } from "@/lib/schema-geocode";
import { resolveDisplayName, resolveIconColor } from "@/lib/schema-node-utils";
import type { ClientDetail } from "@/lib/types";

type Props = {
  client: ClientDetail;
  clientAddress: string;
  nodes: TopologyCanvasNode[];
  mapView?: SchemaMapViewState;
  editMode: boolean;
  selectedNodeId: string | null;
  onMapViewChange: (v: SchemaMapViewState) => void;
  onSelectNode: (id: string | null) => void;
  onNodeGeo: (nodeId: string, lat: number, lng: number) => void;
  getNodeStatus: (n: TopologyCanvasNode) => "online" | "offline" | "unknown";
};

function osmStyle() {
  return {
    version: 8 as const,
    sources: {
      basemap: {
        type: "raster" as const,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap",
      },
    },
    layers: [{ id: "basemap", type: "raster" as const, source: "basemap" }],
  };
}

function satelliteStyle() {
  return {
    version: 8 as const,
    sources: {
      sat: {
        type: "raster" as const,
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "© Esri",
      },
    },
    layers: [{ id: "sat", type: "raster" as const, source: "sat" }],
  };
}

export function SchemaMapView({
  client,
  clientAddress,
  nodes,
  mapView,
  editMode,
  selectedNodeId,
  onMapViewChange,
  onSelectNode,
  onNodeGeo,
  getNodeStatus,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const styleMode = mapView?.style ?? "streets";

  const syncMarkers = useCallback(
    (map: MapLibreMap) => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      const maplibregl = maplibreRef.current;
      if (!maplibregl) return;

      for (const n of nodes) {
        const lat = n.planMeta?.geoLat;
        const lng = n.planMeta?.geoLng;
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const st = getNodeStatus(n);
        const color =
          st === "online" ? "#22c55e" : st === "offline" ? "#ef4444" : resolveIconColor(n);
        const el = document.createElement("button");
        el.type = "button";
        el.title = resolveDisplayName(n, client);
        el.className = `flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold text-white shadow-md ${
          selectedNodeId === n.id ? "border-cyan-300 ring-2 ring-cyan-400/60" : "border-white/80"
        }`;
        el.style.backgroundColor = color;
        el.textContent = String(n.cameraPlan?.badge ?? "");
        el.onclick = (e) => {
          e.stopPropagation();
          onSelectNode(n.id);
        };

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
      }
    },
    [client, getNodeStatus, nodes, onSelectNode, selectedNodeId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const maplibregl = await import("maplibre-gl");
      maplibreRef.current = maplibregl;
      if (cancelled || !containerRef.current) return;

      const center = mapView ?? {
        centerLng: DEFAULT_MAP_CENTER.lng,
        centerLat: DEFAULT_MAP_CENTER.lat,
        zoom: DEFAULT_MAP_CENTER.zoom,
        style: styleMode,
      };

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleMode === "satellite" ? satelliteStyle() : osmStyle(),
        center: [center.centerLng, center.centerLat],
        zoom: center.zoom,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

      map.on("load", () => {
        if (!cancelled) {
          syncMarkers(map);
          setReady(true);
        }
      });

      map.on("moveend", () => {
        const c = map.getCenter();
        onMapViewChange({
          centerLng: c.lng,
          centerLat: c.lat,
          zoom: map.getZoom(),
          style: styleMode,
        });
      });

      map.on("click", (e) => {
        if (!editMode || !selectedNodeId) return;
        onNodeGeo(selectedNodeId, e.lngLat.lat, e.lngLat.lng);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; style switch handled separately
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    syncMarkers(map);
  }, [nodes, ready, syncMarkers, selectedNodeId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const style = styleMode === "satellite" ? satelliteStyle() : osmStyle();
    map.setStyle(style);
    map.once("styledata", () => syncMarkers(map));
  }, [styleMode, ready, syncMarkers]);

  async function centerOnAddress() {
    if (!clientAddress.trim()) return;
    setGeocoding(true);
    const hit = await geocodeAddress(clientAddress);
    setGeocoding(false);
    const map = mapRef.current;
    if (!hit || !map) return;
    map.flyTo({ center: [hit.lng, hit.lat], zoom: 17 });
    onMapViewChange({
      centerLng: hit.lng,
      centerLat: hit.lat,
      zoom: 17,
      style: styleMode,
    });
  }

  function toggleStyle() {
    const next = styleMode === "streets" ? "satellite" : "streets";
    onMapViewChange({
      centerLng: mapView?.centerLng ?? DEFAULT_MAP_CENTER.lng,
      centerLat: mapView?.centerLat ?? DEFAULT_MAP_CENTER.lat,
      zoom: mapView?.zoom ?? DEFAULT_MAP_CENTER.zoom,
      style: next,
    });
  }

  const geoCount = nodes.filter(
    (n) => n.planMeta?.geoLat != null && n.planMeta?.geoLng != null,
  ).length;

  return (
    <div className="flex min-h-[480px] flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-xs">
        <button
          type="button"
          disabled={geocoding || !clientAddress.trim()}
          onClick={() => void centerOnAddress()}
          className="inline-flex items-center gap-1 rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)] disabled:opacity-40"
        >
          {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          Centriraj na naslov
        </button>
        <button type="button" onClick={toggleStyle} className="inline-flex items-center gap-1 rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)]">
          {styleMode === "satellite" ? <MapIcon className="h-3 w-3" /> : <Satellite className="h-3 w-3" />}
          {styleMode === "satellite" ? "Ceste" : "Satelit"}
        </button>
        <span className="text-[var(--vo-muted)]">
          GPS točk: <strong className="text-[var(--vo-fg)]">{geoCount}</strong> / {nodes.length}
        </span>
        {editMode && selectedNodeId ? (
          <span className="text-amber-200/90">Klik na zemljevid postavi GPS izbrane naprave.</span>
        ) : editMode ? (
          <span className="text-[var(--vo-muted)]">Najprej izberite napravo na zemljevidu ali tlorisu.</span>
        ) : null}
      </div>
      <div ref={containerRef} className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-[var(--vo-border)]" />
    </div>
  );
}

"use client";

import "@/styles/leaflet-map.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Box, Plus, Minus, Radio } from "lucide-react";
import type { MapProject } from "@/lib/map-projects";
import {
  KARACHI_CENTER,
  KARACHI_DEFAULT_ZOOM,
  KARACHI_MAX_BOUNDS,
  normalizePakistanCoords,
} from "@/lib/map-karachi";
import { cn } from "@/lib/utils";

interface ProjectsMapPanelProps {
  projects: MapProject[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onRefreshMapData?: () => void;
  className?: string;
}

type MapLayerStyle = "street" | "satellite" | "hybrid";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS_URL =
  "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png";

const LIVE_REFRESH_MS = 45_000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n: number | null | undefined, currency = "PKR"): string {
  if (n == null || n <= 0) return "";
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString()}`;
}

function pinHtml(project: MapProject, selected: boolean, mobile: boolean): string {
  const img =
    project.imageUrl ?? "/assets/images/home/northkarachi.jpg";
  const safeImg = escapeHtml(img);
  const cls = selected ? "abadraho-map-pin is-selected" : "abadraho-map-pin";
  const mobileCls = mobile ? " is-mobile" : "";
  return `<div class="${cls}${mobileCls}"><img class="abadraho-map-pin-img" src="${safeImg}" alt="" loading="lazy" /></div>`;
}

function popupHtml(project: MapProject): string {
  const img =
    project.imageUrl ?? "/assets/images/home/northkarachi.jpg";
  const price = formatPrice(project.minPrice);
  const area = project.area ? escapeHtml(project.area) : "";
  return `<a href="/project/${escapeHtml(project.slug)}" class="abadraho-map-popup">
    <img src="${escapeHtml(img)}" alt="" />
    <div class="abadraho-map-popup-body">
      <strong>${escapeHtml(project.name)}</strong>
      ${price ? `<span class="abadraho-map-popup-price">${escapeHtml(price)}</span>` : ""}
      ${area ? `<span class="abadraho-map-popup-area">${area}</span>` : ""}
    </div>
  </a>`;
}

function withNormalizedCoords(projects: MapProject[]) {
  const out: (MapProject & { latitude: number; longitude: number })[] = [];
  for (const p of projects) {
    const coords = normalizePakistanCoords(p.latitude, p.longitude);
    if (!coords) continue;
    out.push({ ...p, latitude: coords.lat, longitude: coords.lng });
  }
  return out;
}

/** Interactive map — Leaflet with Karachi default + layer / live / 3D controls */
export function ProjectsMapPanel({
  projects,
  selectedId,
  onSelect,
  onRefreshMapData,
  className,
}: ProjectsMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const streetLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const satelliteLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const labelsLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const mapReadyRef = useRef(false);
  const initialFitDoneRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [layerStyle, setLayerStyle] = useState<MapLayerStyle>("street");
  const [liveOn, setLiveOn] = useState(false);
  const [mode3d, setMode3d] = useState(false);

  const withCoords = withNormalizedCoords(projects);
  // Read inside the one-time "map ready" callback, which would otherwise see a stale count.
  const coordsCountRef = useRef(withCoords.length);
  coordsCountRef.current = withCoords.length;

  const isMapUsable = useCallback(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !mapReadyRef.current || !el?.isConnected) return false;
    try {
      const pane = map.getPane("mapPane");
      return Boolean(pane && (pane as HTMLElement).parentElement);
    } catch {
      return false;
    }
  }, []);

  const runOnMap = useCallback((fn: (map: import("leaflet").Map) => void) => {
    if (!isMapUsable()) return;
    const map = mapRef.current!;
    try {
      map.stop();
      fn(map);
    } catch {
      /* map mid-teardown */
    }
  }, [isMapUsable]);

  const applyBaseLayers = useCallback(
    (L: typeof import("leaflet"), map: import("leaflet").Map, style: MapLayerStyle) => {
      streetLayerRef.current?.remove();
      satelliteLayerRef.current?.remove();
      labelsLayerRef.current?.remove();

      if (style === "street") {
        streetLayerRef.current?.addTo(map);
      } else if (style === "satellite") {
        satelliteLayerRef.current?.addTo(map);
      } else {
        satelliteLayerRef.current?.addTo(map);
        labelsLayerRef.current?.addTo(map);
      }
      map.invalidateSize({ animate: false });
    },
    []
  );

  const syncMarkers = useCallback(
    (
      L: typeof import("leaflet"),
      map: import("leaflet").Map,
      opts: { fit: boolean }
    ) => {
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch {
          /* removed with map */
        }
      });
      markersRef.current = [];

      const bounds: import("leaflet").LatLngExpression[] = [];

      withCoords.forEach((p) => {
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        const pos: import("leaflet").LatLngExpression = [lat, lng];
        bounds.push(pos);

        const selected = p.id === selectedId;
        const mobile =
          typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
        const base = mobile ? 34 : 44;
        const selectedSize = mobile ? 40 : 52;
        const size = selected ? selectedSize : base;
        const anchor = size / 2;

        const icon = L.divIcon({
          className: "abadraho-map-marker-wrap",
          html: pinHtml(p, selected, mobile),
          iconSize: [size, size],
          iconAnchor: [anchor, anchor],
          popupAnchor: [0, -Math.round(size / 2)],
        });

        const marker = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(popupHtml(p), {
            maxWidth: 260,
            className: "abadraho-leaflet-popup",
          })
          .on("click", () => onSelectRef.current(p.id));
        marker.bindTooltip(escapeHtml(p.name), {
          direction: "top",
          offset: [0, -20],
          className: "abadraho-map-tooltip",
        });
        markersRef.current.push(marker);
      });

      if (!opts.fit) return;

      const mobile =
        typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

      if (bounds.length > 1) {
        map.fitBounds(bounds as import("leaflet").LatLngBoundsExpression, {
          padding: mobile ? [20, 20] : [48, 48],
          maxZoom: mobile ? 14 : 13,
          animate: false,
        });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], mobile ? 14 : 13, { animate: false });
      } else {
        map.setView(KARACHI_CENTER, KARACHI_DEFAULT_ZOOM, { animate: false });
      }
    },
    [withCoords, selectedId]
  );

  const syncMarkersRef = useRef(syncMarkers);
  syncMarkersRef.current = syncMarkers;

  /* Create map once — never depend on projects/syncMarkers here */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        fadeAnimation: false,
        zoomAnimation: false,
      });

      map.setMaxBounds(
        L.latLngBounds(
          [KARACHI_MAX_BOUNDS.south, KARACHI_MAX_BOUNDS.west],
          [KARACHI_MAX_BOUNDS.north, KARACHI_MAX_BOUNDS.east]
        )
      );

      streetLayerRef.current = L.tileLayer(OSM_URL, {
        attribution: "© OpenStreetMap · AbadRaho",
        maxZoom: 19,
      });
      satelliteLayerRef.current = L.tileLayer(SATELLITE_URL, {
        attribution: "© Esri · AbadRaho",
        maxZoom: 19,
      });
      labelsLayerRef.current = L.tileLayer(LABELS_URL, {
        attribution: "© CARTO",
        maxZoom: 19,
        subdomains: "abcd",
      });

      map.setView(KARACHI_CENTER, KARACHI_DEFAULT_ZOOM, { animate: false });
      streetLayerRef.current.addTo(map);

      mapRef.current = map;

      map.whenReady(() => {
        if (cancelled) return;
        mapReadyRef.current = true;
        map.invalidateSize({ animate: false });
        syncMarkersRef.current(L, map, { fit: true });
        // Only count the first fit once there were pins to fit. The home map starts empty and
        // loads pins afterwards; marking it done here would leave it on the default view.
        initialFitDoneRef.current = coordsCountRef.current > 0;
      });

      resizeObserver = new ResizeObserver(() => {
        if (!isMapUsable()) return;
        requestAnimationFrame(() => {
          runOnMap((m) => m.invalidateSize({ animate: false }));
        });
      });
      resizeObserver.observe(el);
    });

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      initialFitDoneRef.current = false;
      resizeObserver?.disconnect();

      const map = mapRef.current;
      if (map) {
        try {
          map.stop();
          map.remove();
        } catch {
          /* already removed */
        }
      }
      mapRef.current = null;
      markersRef.current = [];
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
      labelsLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map must init once only
  }, []);

  useEffect(() => {
    if (!mapReadyRef.current) return;
    import("leaflet").then((L) => {
      if (!isMapUsable()) return;
      const map = mapRef.current!;
      let style: MapLayerStyle = layerStyle;
      if (mode3d && layerStyle === "street") style = "satellite";
      applyBaseLayers(L, map, style);
    });
  }, [layerStyle, mode3d, applyBaseLayers, isMapUsable]);

  useEffect(() => {
    if (!mapReadyRef.current) return;
    const t = window.setTimeout(() => {
      import("leaflet").then((L) => {
        if (!isMapUsable()) return;
        const map = mapRef.current!;
        const shouldFit = !initialFitDoneRef.current && withCoords.length > 0;
        syncMarkers(L, map, { fit: shouldFit });
        if (shouldFit) initialFitDoneRef.current = true;
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [projects, selectedId, syncMarkers, isMapUsable, withCoords.length]);

  useEffect(() => {
    if (!selectedId || !mapReadyRef.current) return;
    const p = withCoords.find((x) => x.id === selectedId);
    if (p?.latitude == null || p.longitude == null) return;

    const t = window.setTimeout(() => {
      runOnMap((map) => {
        map.setView(
          [Number(p.latitude), Number(p.longitude)],
          mode3d ? 15 : 14,
          { animate: false }
        );
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [selectedId, withCoords, mode3d, runOnMap]);

  useEffect(() => {
    if (!liveOn || !onRefreshMapData) return;
    onRefreshMapData();
    const id = window.setInterval(() => onRefreshMapData(), LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [liveOn, onRefreshMapData]);

  function cycleLayers() {
    setLayerStyle((prev) => {
      if (prev === "street") return "satellite";
      if (prev === "satellite") return "hybrid";
      return "street";
    });
  }

  function toggle3d() {
    setMode3d((prev) => {
      const next = !prev;
      if (next && layerStyle === "street") setLayerStyle("satellite");
      return next;
    });
  }

  useEffect(() => {
    if (!mode3d || !mapReadyRef.current) return;
    runOnMap((map) => {
      const z = map.getZoom();
      map.setZoom(Math.min(z + 1, 16), { animate: false });
    });
  }, [mode3d, runOnMap]);

  function resetKarachiView() {
    runOnMap((map) => {
      map.setView(KARACHI_CENTER, mode3d ? 12 : KARACHI_DEFAULT_ZOOM, {
        animate: false,
      });
    });
  }

  const layerLabel =
    layerStyle === "street" ? "Street" : layerStyle === "satellite" ? "Satellite" : "Hybrid";

  return (
    <div className={cn("projects-map-panel relative h-full w-full bg-zinc-200", className)}>
      <div ref={containerRef} className="h-full w-full min-h-[180px]" />

      <div className="projects-map-panel__tools absolute right-2 top-2 z-[1000] flex flex-col gap-1 sm:right-3 sm:top-3">
        <MapToolBtn
          icon={Radio}
          title={liveOn ? "Live updates on" : "Live updates off"}
          active={liveOn}
          onClick={() => setLiveOn((v) => !v)}
          className="hidden sm:flex"
        />
        <MapToolBtn
          icon={Box}
          title={mode3d ? "3D view on" : "3D view off"}
          active={mode3d}
          onClick={toggle3d}
          className="hidden sm:flex"
        />
        <MapToolBtn
          icon={Layers}
          title={`Layer: ${layerLabel}`}
          active={layerStyle !== "street"}
          onClick={cycleLayers}
          className="hidden sm:flex"
        />
        <div className="my-1 hidden h-px bg-zinc-300 sm:block" />
        <MapToolBtn
          icon={Plus}
          title="Zoom in"
          onClick={() => runOnMap((m) => m.zoomIn())}
        />
        <MapToolBtn
          icon={Minus}
          title="Zoom out"
          onClick={() => runOnMap((m) => m.zoomOut())}
        />
      </div>

      <button
        type="button"
        onClick={resetKarachiView}
        className="absolute bottom-3 right-2 z-[1000] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 sm:bottom-4 sm:right-3 sm:px-3"
      >
        Karachi
      </button>

      {withCoords.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[999] flex flex-col items-center justify-center gap-2 bg-zinc-100/90 p-6 text-center text-sm text-zinc-600">
          <p>No project coordinates in Karachi region for this filter.</p>
        </div>
      )}
    </div>
  );
}

function MapToolBtn({
  icon: Icon,
  title,
  active = false,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

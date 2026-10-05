"use client";

import "@/styles/leaflet-map.css";
import { useEffect, useRef } from "react";
import { ExternalLink, MapPin } from "lucide-react";

interface ProjectLocationMapProps {
  name: string;
  address: string | null;
  area: string | null;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  imageUrl?: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function googleMapsUrl(
  lat: number | null | undefined,
  lng: number | null | undefined,
  address: string | null,
  areaName: string | null
): string {
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const q = [address, areaName].filter(Boolean).join(", ");
  if (q) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  return "https://www.google.com/maps";
}

export function ProjectLocationMap({
  name,
  address,
  area,
  latitude,
  longitude,
  imageUrl,
}: ProjectLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  const lat = latitude != null ? Number(latitude) : null;
  const lng = longitude != null ? Number(longitude) : null;
  const hasCoords =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  const mapsLink = googleMapsUrl(lat, lng, address, area);

  useEffect(() => {
    const el = containerRef.current;
    if (!hasCoords || !el || mapRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        fadeAnimation: false,
        zoomAnimation: false,
      }).setView([lat!, lng!], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const img =
        imageUrl ?? "/assets/images/home/northkarachi.jpg";
      const icon = L.divIcon({
        className: "abadraho-map-marker-wrap",
        html: `<div class="abadraho-map-pin is-selected"><img src="${escapeHtml(img)}" alt="" /></div>`,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
        popupAnchor: [0, -28],
      });

      L.marker([lat!, lng!], { icon })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(name)}</strong>`);

      mapRef.current = map;

      map.whenReady(() => {
        if (cancelled) return;
        map.invalidateSize({ animate: false });
        map.setView([lat!, lng!], 15, { animate: false });
      });

      resizeObserver = new ResizeObserver(() => {
        if (cancelled || !mapRef.current) return;
        requestAnimationFrame(() => {
          mapRef.current?.invalidateSize({ animate: false });
        });
      });
      resizeObserver.observe(el);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [hasCoords, lat, lng, name, imageUrl]);

  if (!hasCoords && !address && !area) return null;

  return (
    <section className="overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4">
        <h2 className="text-lg font-semibold text-zinc-900">Location</h2>
      </div>
      <div className="p-5">
        {(address || area) && (
          <div className="mb-4 flex items-start gap-2 text-sm text-zinc-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              {address && <p>{address}</p>}
              {area && <p className="text-zinc-500">{area}</p>}
            </div>
          </div>
        )}

        {hasCoords ? (
          <div
            ref={containerRef}
            className="abadraho-project-location-map h-[400px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
          />
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
            Map coordinates not available. Open in Google Maps below.
          </div>
        )}

        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </a>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { ASSET_META } from "@/lib/map-data";
import type { ChargingAsset } from "@/lib/charging/fields";

/**
 * Zeno Charging Network on a map, drawn like Vehicle Tracking's Map View
 * (MapLibre on Esri's keyless street map; Google's own tiles need a paid API
 * key). Nearby assets group into a black circle with a white count; clicking
 * it zooms in until each asset stands on its own as a pin, coloured by type.
 * Assets at exactly the same spot (several chargers at one hub) stay grouped:
 * clicking that group lists them. Clicking a pin opens the asset.
 */
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    basemap: {
      type: "raster",
      tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, USGS, NGA, and the GIS User Community",
    },
  },
  layers: [{ id: "basemap", type: "raster", source: "basemap" }],
};

export const PIN_COLORS = { "Swap Station": ASSET_META.swap_station.color, "Fast Charger": ASSET_META.fast_charger.color } as const;
const CLUSTER_MAX_ZOOM = 16;

/** A map pin (teardrop with a white dot) as an image MapLibre can place; drawn at 2x for sharp edges. */
function pinImage(color: string, scale = 1, ring?: string): ImageData {
  const r = 2; // pixel ratio
  const w = Math.round(30 * scale * r), h = Math.round(40 * scale * r);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const cx = w / 2, cy = w / 2, rad = w / 2 - 3 * r;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, Math.PI * 0.82, Math.PI * 2.18);
  ctx.lineTo(cx, h - 2 * r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = (ring ? 3 : 2) * r;
  ctx.strokeStyle = ring ?? "#ffffff";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  return ctx.getImageData(0, 0, w, h);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

function toFeatures(assets: ChargingAsset[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets
      .filter((a) => a.lat != null && a.lng != null)
      .map((a) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [a.lng!, a.lat!] },
        properties: { id: a.id, kind: a.assetType === "Fast Charger" ? "fast" : "swap", name: a.assetName, assetId: a.assetId ?? "No Asset ID", type: a.assetType, town: a.town, status: a.archivedAt ? "Archived" : a.commissionStatus },
      })),
  };
}

function hoverHtml(p: Record<string, unknown>): string {
  return `<div style="font-family:inherit;min-width:180px">` +
    `<div style="font-size:12.5px;font-weight:600;color:#0f172a;line-height:1.35">${esc(String(p.name))}</div>` +
    `<div style="font-size:11.5px;color:#64748b;margin-top:2px">${esc(String(p.type))} · ${esc(String(p.assetId))}</div>` +
    `<div style="font-size:11.5px;color:#64748b">${esc(String(p.town))} · ${esc(String(p.status))}</div>` +
    `<div style="font-size:11px;color:#0f766e;margin-top:4px">Click to open</div></div>`;
}

export function ChargingMap({
  assets,
  activeId,
  onOpen,
  focusZoom = 14,
}: {
  assets: ChargingAsset[];
  /** The asset to show as the active pin (the asset page's map); the map centres on it. */
  activeId?: string;
  onOpen: (id: string) => void;
  focusZoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const assetsRef = useRef(assets);
  const activeRef = useRef(activeId);
  const onOpenRef = useRef(onOpen);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({ container: containerRef.current, style: STYLE, center: [37.2, -0.6], zoom: 6, minZoom: 2, maxZoom: 18, attributionControl: false });
    mapRef.current = map;
    map.on("error", (e) => setFailure(e.error?.message ?? "Unknown map error"));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    const hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0, -34], maxWidth: "260px" });
    const listPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 18, maxWidth: "300px" });

    map.on("load", () => {
      map.addImage("pin-swap", pinImage(PIN_COLORS["Swap Station"]), { pixelRatio: 2 });
      map.addImage("pin-fast", pinImage(PIN_COLORS["Fast Charger"]), { pixelRatio: 2 });
      map.addImage("pin-active-swap", pinImage(PIN_COLORS["Swap Station"], 1.35, "#0f172a"), { pixelRatio: 2 });
      map.addImage("pin-active-fast", pinImage(PIN_COLORS["Fast Charger"], 1.35, "#0f172a"), { pixelRatio: 2 });

      const others = assetsRef.current.filter((a) => a.id !== activeRef.current);
      const active = assetsRef.current.filter((a) => a.id === activeRef.current);
      map.addSource("assets", { type: "geojson", data: toFeatures(others), cluster: true, clusterRadius: 44, clusterMaxZoom: CLUSTER_MAX_ZOOM });
      map.addSource("active", { type: "geojson", data: toFeatures(active) });

      // Overlapping assets: a black circle with the count in white.
      map.addLayer({ id: "clusters", type: "circle", source: "assets", filter: ["has", "point_count"], paint: {
        "circle-color": "#0f172a",
        "circle-radius": ["step", ["get", "point_count"], 15, 10, 19, 30, 24, 100, 30],
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
      } });
      map.addLayer({ id: "cluster-count", type: "symbol", source: "assets", filter: ["has", "point_count"], layout: {
        "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"],
        "text-size": ["step", ["get", "point_count"], 12, 30, 14, 100, 16], "text-allow-overlap": true,
      }, paint: { "text-color": "#ffffff" } });
      // Once apart: a pin per asset, coloured by type.
      map.addLayer({ id: "pins", type: "symbol", source: "assets", filter: ["!", ["has", "point_count"]], layout: {
        "icon-image": ["match", ["get", "kind"], "fast", "pin-fast", "pin-swap"], "icon-anchor": "bottom", "icon-allow-overlap": true,
      } });
      map.addLayer({ id: "active-pin", type: "symbol", source: "active", layout: {
        "icon-image": ["match", ["get", "kind"], "fast", "pin-active-fast", "pin-active-swap"], "icon-anchor": "bottom", "icon-allow-overlap": true,
      } });

      map.on("click", "clusters", (e: MapLayerMouseEvent) => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = f?.properties?.cluster_id as number | undefined;
        if (clusterId == null) return;
        const src = map.getSource("assets") as GeoJSONSource;
        const at = (f.geometry as Point).coordinates as [number, number];
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          if (zoom <= CLUSTER_MAX_ZOOM && map.getZoom() < CLUSTER_MAX_ZOOM) {
            map.easeTo({ center: at, zoom: Math.max(zoom, map.getZoom() + 1) });
            return;
          }
          // Same spot: zooming won't separate them, so list them.
          src.getClusterLeaves(clusterId, 50, 0).then((leaves) => {
            const box = document.createElement("div");
            box.style.cssText = "font-family:inherit;min-width:200px";
            const head = document.createElement("div");
            head.textContent = `${leaves.length} assets at this spot`;
            head.style.cssText = "font-size:12px;font-weight:600;color:#0f172a;margin-bottom:6px";
            box.appendChild(head);
            for (const leaf of leaves) {
              const p = leaf.properties as Record<string, unknown>;
              const b = document.createElement("button");
              b.type = "button";
              b.style.cssText = "display:block;width:100%;text-align:left;padding:5px 6px;border-radius:6px;font-size:12px;color:#0f172a;cursor:pointer;background:none;border:0";
              b.onmouseenter = () => { b.style.background = "#f1f5f9"; };
              b.onmouseleave = () => { b.style.background = "none"; };
              b.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;margin-right:6px;background:${p.kind === "fast" ? PIN_COLORS["Fast Charger"] : PIN_COLORS["Swap Station"]}"></span>${esc(String(p.name))}<div style="font-size:11px;color:#64748b;margin-left:14px">${esc(String(p.assetId))}</div>`;
              b.onclick = () => { listPopup.remove(); onOpenRef.current(String(p.id)); };
              box.appendChild(b);
            }
            listPopup.setLngLat(at).setDOMContent(box).addTo(map);
          });
        });
      });

      for (const layer of ["pins", "active-pin"]) {
        map.on("mouseenter", layer, (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          hover.setLngLat((f.geometry as Point).coordinates as [number, number]).setHTML(hoverHtml(f.properties as Record<string, unknown>)).addTo(map);
        });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; hover.remove(); });
        map.on("click", layer, (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) { hover.remove(); onOpenRef.current(String(id)); }
        });
      }
      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });

      readyRef.current = true;
      frame(map);
    });

    const frame = (m: maplibregl.Map) => {
      const a = assetsRef.current.find((x) => x.id === activeRef.current);
      if (a?.lat != null && a.lng != null) {
        m.jumpTo({ center: [a.lng, a.lat], zoom: focusZoom });
        return;
      }
      const pts = assetsRef.current.filter((x) => x.lat != null && x.lng != null);
      if (!pts.length) return;
      const bounds = new maplibregl.LngLatBounds();
      for (const p of pts) bounds.extend([p.lng!, p.lat!]);
      m.fitBounds(bounds, { padding: 56, maxZoom: 12, duration: 0 });
    };

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; readyRef.current = false; };
    // The map is built once; data and the active asset are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    assetsRef.current = assets;
    activeRef.current = activeId;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource("assets") as GeoJSONSource | undefined)?.setData(toFeatures(assets.filter((a) => a.id !== activeId)));
    (map.getSource("active") as GeoJSONSource | undefined)?.setData(toFeatures(assets.filter((a) => a.id === activeId)));
    const a = assets.find((x) => x.id === activeId);
    if (a?.lat != null && a.lng != null) map.easeTo({ center: [a.lng, a.lat], zoom: Math.max(map.getZoom(), focusZoom) });
  }, [assets, activeId, focusZoom]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {failure && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/95 px-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-slate-600">The map could not load</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{failure}. Every asset is still in List View.</p>
          </div>
        </div>
      )}
    </div>
  );
}

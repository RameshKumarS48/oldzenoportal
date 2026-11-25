"use client";

/** Values by place, as circles sized by the value, on the same keyless street map the rest of Dome uses. */
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Result } from "@/lib/dashboards/query";
import { full } from "./format";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const STYLE: StyleSpecification = {
  version: 8,
  sources: { basemap: { type: "raster", tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 18, attribution: "Tiles © Esri" } },
  layers: [{ id: "basemap", type: "raster", source: "basemap" }],
};

export default function MapView({ result }: { result: Extract<Result, { type: "groups" }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const points = result.rows.filter((r) => r.lat != null && r.lng != null);
  const key = JSON.stringify(points);

  useEffect(() => {
    if (!ref.current) return;
    const rows = JSON.parse(key) as typeof points;
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({ container: ref.current, style: STYLE, center: [37.2, -0.6], zoom: 5, attributionControl: false });
    map.on("error", () => setFailed(true));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    const max = Math.max(...rows.map((r) => r.value), 1);
    map.on("load", () => {
      map.addSource("points", { type: "geojson", data: { type: "FeatureCollection", features: rows.map((r) => ({ type: "Feature", geometry: { type: "Point", coordinates: [r.lng!, r.lat!] }, properties: { label: r.label, value: r.value, size: 6 + Math.sqrt(r.value / max) * 22 } })) } });
      map.addLayer({ id: "points", type: "circle", source: "points", paint: { "circle-radius": ["get", "size"], "circle-color": "#2a78d6", "circle-opacity": 0.55, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.on("mousemove", "points", (e) => {
        const p = e.features?.[0]?.properties as { label: string; value: number } | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = "pointer";
        popup.setLngLat(e.lngLat).setText(`${p.label}: ${full(Number(p.value), result.unit)}`).addTo(map);
      });
      map.on("mouseleave", "points", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
      if (rows.length) {
        const bounds = new maplibregl.LngLatBounds();
        rows.forEach((r) => bounds.extend([r.lng!, r.lat!]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 0 });
      }
    });
    return () => map.remove();
  }, [key, result.unit]);

  if (failed) return <p className="grid h-full place-items-center text-xs text-slate-500">The map couldn’t load. Use “View as” to see this as bars.</p>;
  return <div ref={ref} className="h-full w-full overflow-hidden rounded-lg" />;
}

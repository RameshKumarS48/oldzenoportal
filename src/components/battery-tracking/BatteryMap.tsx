"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { SegmentedControl } from "@/components/ui/FilterControls";

type View = "map" | "satellite";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

/**
 * Two keyless Esri basemaps, one shown at a time: World Street Map and World
 * Imagery. Esri's terms ask for the credits below. (Map View's CARTO tiles now
 * answer every request with an "API key required" image, so they aren't used.)
 */
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    streets: {
      type: "raster",
      tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Tiles © Esri — Source: Esri, HERE, Garmin, USGS, NGA, and the GIS User Community",
    },
    satellite: {
      type: "raster",
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    { id: "streets", type: "raster", source: "streets" },
    { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } },
  ],
};

/**
 * The map controls' frame (globals.css .maplibregl-ctrl-group: 8px radius,
 * slate-200 border, the same shadow), for our own controls. The class itself
 * isn't used on them: MapLibre's CSS sizes every button inside it to 29px and
 * rules lines between them.
 */
const FRAME = "absolute bg-white rounded-lg border border-slate-200 overflow-hidden shadow-[0_2px_10px_rgba(2,6,23,0.14)]";

/** How far one pan button moves the map, in px. */
const STEP = 120;

/**
 * One battery's position on a MapLibre map, as Vehicle Tracking's Map View draws
 * maps: zoom +/− always showing (top right), a Map / Satellite switch (top
 * left), and up/down/left/right pan buttons under the zoom, in the same
 * control style. The pin is the brand orange-red.
 */
export function BatteryMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [view, setView] = useState<View>("map");
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    // As FleetMap: the self-hosted worker (see scripts/copy-maplibre-worker.mjs).
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [lng, lat],
      zoom: 15,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("error", (e) => {
      const message = e.error?.message ?? "Unknown map error";
      console.error("[BatteryMap]", message, e);
      setFailure(message);
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    new maplibregl.Marker({ color: "#FF3B06" }).setLngLat([lng, lat]).addTo(map);

    // As FleetMap: re-measure when the box changes size (it's dynamically loaded, and stacks below lg).
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  function switchView(next: View) {
    setView(next);
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      map.setLayoutProperty("streets", "visibility", next === "map" ? "visible" : "none");
      map.setLayoutProperty("satellite", "visibility", next === "satellite" ? "visible" : "none");
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }

  const pan = (x: number, y: number) => mapRef.current?.panBy([x, y]);
  const PAN = [
    { label: "Pan north", icon: ChevronUp, x: 0, y: -STEP, cell: "col-start-2 row-start-1" },
    { label: "Pan west", icon: ChevronLeft, x: -STEP, y: 0, cell: "col-start-1 row-start-2" },
    { label: "Pan east", icon: ChevronRight, x: STEP, y: 0, cell: "col-start-3 row-start-2" },
    { label: "Pan south", icon: ChevronDown, x: 0, y: STEP, cell: "col-start-2 row-start-3" },
  ];

  return (
    <div className="relative w-full h-full" aria-label={label} role="region">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map / Satellite, in the portal's List View / Map View switch, framed like the map's controls. */}
      <div className={`${FRAME} top-2.5 left-2.5`}>
        <SegmentedControl
          value={view}
          onChange={switchView}
          options={[
            { value: "map", label: "Map" },
            { value: "satellite", label: "Satellite" },
          ]}
        />
      </div>

      {/* Pan buttons, under the zoom control (10px inset + 60px tall + 10px gap), in its control style. */}
      <div className={`${FRAME} top-20 right-2.5 grid grid-cols-3 grid-rows-3`}>
        {PAN.map(({ label: name, icon: Icon, x, y, cell }) => (
          <button
            key={name}
            type="button"
            aria-label={name}
            title={name}
            onClick={() => pan(x, y)}
            className={`${cell} flex items-center justify-center w-7 h-7 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zeno-teal/40`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {failure && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/95 px-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-slate-600">The map could not load</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {failure}. The coordinates are in the details card.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

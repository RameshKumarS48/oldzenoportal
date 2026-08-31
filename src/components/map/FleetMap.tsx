"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { ASSET_META, type MapAsset } from "@/lib/map-data";

type Mode = "pins" | "heatmap";

const CARTO_TILES = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
];

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster",
      tiles: CARTO_TILES,
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

const PIN_LAYERS = ["clusters", "cluster-count", "points"];

function toFeatureCollection(assets: MapAsset[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: assets.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lng, a.lat] },
      properties: {
        id: a.id,
        kind: a.kind,
        color: ASSET_META[a.kind].color,
        html: a.html,
      },
    })),
  };
}

function applyMode(map: maplibregl.Map, mode: Mode) {
  const pins = mode === "pins";
  for (const id of PIN_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", pins ? "visible" : "none");
  }
  if (map.getLayer("heat")) map.setLayoutProperty("heat", "visibility", pins ? "none" : "visible");
}

export function FleetMap({ assets, mode }: { assets: MapAsset[]; mode: Mode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const readyRef = useRef(false);
  const assetsRef = useRef(assets);
  const modeRef = useRef<Mode>(mode);

  // init once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    // Turbopack's default worker resolution ships a broken worker in the
    // production build — every GeoJSON source then hangs at 0 features, so the
    // basemap renders but no pins/clusters/heatmap ever appear. Point MapLibre
    // at our self-hosted worker instead (see scripts/copy-maplibre-worker.mjs).
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [37.55, -0.55],
      zoom: 6.1,
      minZoom: 2,
      maxZoom: 17,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      maxWidth: "260px",
    });
    popupRef.current = popup;

    map.on("load", () => {
      map.addSource("assets", {
        type: "geojson",
        data: toFeatureCollection(assetsRef.current),
        cluster: true,
        clusterRadius: 38,
        clusterMaxZoom: 12,
      });
      map.addSource("assets-raw", { type: "geojson", data: toFeatureCollection(assetsRef.current) });

      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "assets-raw",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": 1.3,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 1.4, 9, 2.6, 15, 3.8],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 16, 7, 28, 11, 42, 16, 60],
          "heatmap-opacity": 0.9,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(20,184,166,0)",
            0.1, "rgba(45,212,191,0.6)",
            0.3, "#22c55e",
            0.5, "#eab308",
            0.7, "#f97316",
            1, "#ef4444",
          ],
        },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "assets",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#003B49",
          "circle-opacity": 0.95,
          "circle-radius": ["step", ["get", "point_count"], 17, 10, 22, 30, 28, 100, 34],
          "circle-stroke-width": 4,
          "circle-stroke-color": "rgba(0,59,73,0.25)",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "assets",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["step", ["get", "point_count"], 13, 30, 15, 100, 17],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#003B49",
          "text-halo-width": 1,
        },
      });

      map.addLayer({
        id: "points",
        type: "circle",
        source: "assets",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 6, 9, 8, 13, 11, 16, 14],
          "circle-opacity": 1,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // expand a cluster on click
      map.on("click", "clusters", (e: MapLayerMouseEvent) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = feats[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const src = map.getSource("assets") as GeoJSONSource;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = feats[0].geometry as Point;
          map.easeTo({ center: geom.coordinates as [number, number], zoom });
        });
      });
      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });

      // hover popup on individual pins
      const showPopup = (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const geom = f.geometry as Point;
        const html = (f.properties?.html as string | undefined) ?? "";
        popup.setLngLat(geom.coordinates as [number, number]).setHTML(html).addTo(map);
      };
      map.on("mouseenter", "points", showPopup);
      map.on("mousemove", "points", showPopup);
      map.on("mouseleave", "points", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      readyRef.current = true;
      applyMode(map, modeRef.current);

      // frame the data on first load (concentrated in Kenya, still zoomable out)
      const data = assetsRef.current;
      if (data.length) {
        const bounds = new maplibregl.LngLatBounds();
        for (const a of data) bounds.extend([a.lng, a.lat]);
        map.fitBounds(bounds, { padding: 64, maxZoom: 11, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // push data updates (filter toggles) into the sources
  useEffect(() => {
    assetsRef.current = assets;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const fc = toFeatureCollection(assets);
    (map.getSource("assets") as GeoJSONSource | undefined)?.setData(fc);
    (map.getSource("assets-raw") as GeoJSONSource | undefined)?.setData(fc);
  }, [assets]);

  // toggle pins <-> heatmap
  useEffect(() => {
    modeRef.current = mode;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applyMode(map, mode);
  }, [mode]);

  return <div ref={containerRef} className="w-full h-full" />;
}

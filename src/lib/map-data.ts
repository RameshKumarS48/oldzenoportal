"use client";

/**
 * Fleet-map data layer.
 *
 * The app has no real lat/lng for any asset, everything is anchored by a
 * region key. Here we map each region to a real Kenyan city centroid and
 * deterministically scatter individual assets in a disc around it (seeded by
 * the asset id), so the map clusters at low zoom and breaks into stable
 * individual pins as you zoom in. Positions never move between renders.
 *
 * Six asset kinds are unified into a single `MapAsset[]`:
 *   vehicles, customers, batteries  → live from the Zustand stores
 *   swap stations                   → SWAP_STATIONS (real mock data)
 *   fast chargers                   → derived from the fast-charger sessions
 *   home chargers                   → synthesized (no source data exists)
 */

import { useMemo } from "react";
import { useVehiclesStore } from "@/store/vehicles";
import { useCustomersStore } from "@/store/customers";
import { useBatteriesStore, type Battery } from "@/store/batteries";
import { SWAP_STATIONS } from "@/lib/mock/kpi-infra";

export type RegionKey = "nbo" | "nanyuki" | "nyeri" | "naromoru";

/** Real city centroids ([lng, lat]) + a scatter radius (degrees) per region. */
const CENTROIDS: Record<RegionKey, { lng: number; lat: number; label: string; spread: number }> = {
  nbo:      { lng: 36.8172, lat: -1.2864, label: "Nairobi",   spread: 0.16 },
  nanyuki:  { lng: 37.0723, lat:  0.0069, label: "Nanyuki",   spread: 0.06 },
  nyeri:    { lng: 36.9489, lat: -0.4197, label: "Nyeri",     spread: 0.05 },
  naromoru: { lng: 37.0148, lat: -0.1665, label: "Naro Moru", spread: 0.04 },
};

export const REGION_LABELS: Record<RegionKey, string> = {
  nbo: CENTROIDS.nbo.label,
  nanyuki: CENTROIDS.nanyuki.label,
  nyeri: CENTROIDS.nyeri.label,
  naromoru: CENTROIDS.naromoru.label,
};

// ---- deterministic scatter (no Math.random, pins must be stable) ----------

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Stable [lng, lat] for an asset, scattered in a disc around its region. */
/** Nearest town to a real coordinate, for labelling assets that carry GPS. */
export function regionForCoords(lng: number, lat: number): RegionKey {
  let best: RegionKey = "nbo";
  let bestD = Infinity;
  for (const key of Object.keys(CENTROIDS) as RegionKey[]) {
    const c = CENTROIDS[key];
    const d = (c.lng - lng) ** 2 + (c.lat - lat) ** 2;
    if (d < bestD) { bestD = d; best = key; }
  }
  return best;
}

export function coordsFor(region: RegionKey, seed: string): [number, number] {
  const c = CENTROIDS[region] ?? CENTROIDS.nbo;
  const angle = rand01(hashStr(seed + ":a")) * Math.PI * 2;
  const radius = Math.sqrt(rand01(hashStr(seed + ":r"))) * c.spread;
  const lat = c.lat + radius * Math.sin(angle);
  const lng = c.lng + (radius * Math.cos(angle)) / Math.cos((c.lat * Math.PI) / 180);
  return [lng, lat];
}

// ---- asset kinds -----------------------------------------------------------

export type AssetKind =
  | "vehicle"
  | "customer"
  | "swap_station"
  | "battery"
  | "fast_charger"
  | "home_charger";

export const ASSET_META: Record<AssetKind, { label: string; plural: string; color: string }> = {
  vehicle:      { label: "Vehicle",      plural: "Vehicles",      color: "#10B981" },
  customer:     { label: "Customer",     plural: "Customers",     color: "#6366F1" },
  swap_station: { label: "Swap Station", plural: "Swap Stations", color: "#F59E0B" },
  battery:      { label: "Battery",      plural: "Batteries",     color: "#8B5CF6" },
  fast_charger: { label: "Fast Charger", plural: "Fast Chargers", color: "#EF4444" },
  home_charger: { label: "Home Charger", plural: "Home Chargers", color: "#0EA5E9" },
};

export interface MapAsset {
  id: string;
  kind: AssetKind;
  lng: number;
  lat: number;
  region: RegionKey;
  label: string;
  /** Prebuilt, inline-styled popup body (Tailwind classes can't reach here). */
  html: string;
}

// ---- synthesized / derived static datasets ---------------------------------

/** Fast-charger stations, derived from the real fast-charger session data. */
export const FAST_CHARGERS: { id: string; name: string; region: RegionKey; units: number }[] = [
  { id: "FC-NBO-01", name: "Zeno Hub, Westlands",     region: "nbo",     units: 3 },
  { id: "FC-NBO-02", name: "Upperhill Medical Ctr",    region: "nbo",     units: 2 },
  { id: "FC-NBO-03", name: "Parklands Retail Park",    region: "nbo",     units: 4 },
  { id: "FC-NBO-04", name: "Karen Country Club",       region: "nbo",     units: 2 },
  { id: "FC-NBO-05", name: "Kilimani Business Ctr",    region: "nbo",     units: 2 },
  { id: "FC-NBO-06", name: "Eastleigh Mall",           region: "nbo",     units: 3 },
  { id: "FC-NBO-07", name: "Ruaka Supercentre",        region: "nbo",     units: 2 },
  { id: "FC-NBO-08", name: "Lang'ata Crossing",        region: "nbo",     units: 2 },
  { id: "FC-NBO-09", name: "Kasarani Arena",           region: "nbo",     units: 4 },
  { id: "FC-NAN-01", name: "Nanyuki Town Centre",      region: "nanyuki", units: 3 },
  { id: "FC-NAN-02", name: "Nanyuki Shopping Mall",    region: "nanyuki", units: 2 },
  { id: "FC-NAN-03", name: "Delamere Camp",            region: "nanyuki", units: 1 },
  { id: "FC-NYR-01", name: "Kimathi Way Hub",          region: "nyeri",   units: 2 },
  { id: "FC-NYR-02", name: "Outspan Hotel",            region: "nyeri",   units: 1 },
  { id: "FC-NYR-03", name: "Dedan Kimathi University", region: "nyeri",   units: 2 },
];

/** Residential home chargers, synthesized (no source data exists). */
export const HOME_CHARGERS: {
  id: string;
  owner: string;
  region: RegionKey;
  status: "online" | "offline";
  powerKw: number;
  installDate: string;
}[] = [
  { id: "HC-001", owner: "Caroline Njoki",  region: "nyeri",    status: "online",  powerKw: 7.4, installDate: "2026-07-16" },
  { id: "HC-002", owner: "Patrick Kamau",   region: "nbo",      status: "online",  powerKw: 7.4, installDate: "2026-06-18" },
  { id: "HC-003", owner: "Diana Wanjiku",   region: "nbo",      status: "online",  powerKw: 3.7, installDate: "2026-05-12" },
  { id: "HC-004", owner: "Samuel Odhiambo", region: "nbo",      status: "offline", powerKw: 7.4, installDate: "2026-04-05" },
  { id: "HC-005", owner: "Grace Akinyi",    region: "nbo",      status: "online",  powerKw: 7.4, installDate: "2026-03-17" },
  { id: "HC-006", owner: "Brian Mutua",     region: "nbo",      status: "online",  powerKw: 11,  installDate: "2026-03-02" },
  { id: "HC-007", owner: "Anne Njeri",      region: "nbo",      status: "online",  powerKw: 3.7, installDate: "2025-09-20" },
  { id: "HC-008", owner: "Peter Nderitu",   region: "nanyuki",  status: "online",  powerKw: 7.4, installDate: "2026-06-04" },
  { id: "HC-009", owner: "Mary Wambui",     region: "nanyuki",  status: "offline", powerKw: 7.4, installDate: "2026-05-16" },
  { id: "HC-010", owner: "David Maina",     region: "nanyuki",  status: "online",  powerKw: 3.7, installDate: "2025-10-05" },
  { id: "HC-011", owner: "Lucy Waithera",   region: "nyeri",    status: "online",  powerKw: 7.4, installDate: "2026-03-10" },
  { id: "HC-012", owner: "Michael Kimani",  region: "nyeri",    status: "online",  powerKw: 7.4, installDate: "2026-01-18" },
  { id: "HC-013", owner: "Agnes Nyambura",  region: "naromoru", status: "offline", powerKw: 3.7, installDate: "2025-11-24" },
  { id: "HC-014", owner: "Joseph Kariuki",  region: "nbo",      status: "online",  powerKw: 11,  installDate: "2025-11-08" },
];

// ---- helpers ---------------------------------------------------------------

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function ratingLabel(r: "L" | "M" | "H"): string {
  return r === "H" ? "High" : r === "M" ? "Medium" : "Low";
}

function esc(v: unknown): string {
  return String(v ?? "–").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

type Row = [string, string | number | undefined | null];

export function popupHtml(kind: AssetKind, title: string, rows: Row[]): string {
  const meta = ASSET_META[kind];
  const body = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(
      ([k, v]) =>
        `<div style="display:flex;justify-content:space-between;gap:18px;font-size:12px;line-height:1.75">` +
        `<span style="color:#64748b">${esc(k)}</span>` +
        `<span style="color:#0f172a;font-weight:500;text-align:right">${esc(v)}</span></div>`
    )
    .join("");
  return (
    `<div style="min-width:188px;font-family:ui-sans-serif,system-ui,sans-serif">` +
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">` +
    `<span style="width:8px;height:8px;border-radius:9999px;background:${meta.color};display:inline-block"></span>` +
    `<span style="font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${meta.color}">${meta.label}</span></div>` +
    `<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">${esc(title)}</div>` +
    body +
    `</div>`
  );
}

/** Battery region: prefer its assigned swap station, else parse its location. */
const STATION_REGION = new Map<string, RegionKey>(
  SWAP_STATIONS.map((s) => [s.id, s.region as RegionKey] as const)
);

function batteryRegion(b: Battery): RegionKey {
  if (b.currentAssignment) {
    const r = STATION_REGION.get(b.currentAssignment);
    if (r) return r;
  }
  const loc = b.currentLocation.toLowerCase();
  if (loc.includes("nyeri")) return "nyeri";
  if (loc.includes("nanyuki") || loc.includes("naromoru") || loc.includes("naro moru")) return "nanyuki";
  return "nbo";
}

// ---- the unified asset feed ------------------------------------------------

export function useMapAssets(): MapAsset[] {
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const customers = useCustomersStore((s) => s.customers);
  const batteries = useBatteriesStore((s) => s.batteries);

  return useMemo(() => {
    const out: MapAsset[] = [];

    for (const v of vehicles) {
      const region = v.region as RegionKey;
      const [lng, lat] = coordsFor(region, "veh:" + v.id);
      const label = v.plate || v.vin;
      out.push({
        id: v.id, kind: "vehicle", lng, lat, region, label,
        html: popupHtml("vehicle", label, [
          ["ID", v.id],
          ["VIN", v.vin],
          ["Status", humanize(v.status)],
          ["Connectivity", v.connectivity],
          ["Rider", v.customerName],
          ["Partner", v.partner],
          ["Region", REGION_LABELS[region]],
          ["Odometer", v.odometer.toLocaleString() + " km"],
        ]),
      });
    }

    for (const c of customers) {
      if (c.isDeleted) continue;
      const region = c.region as RegionKey;
      const [lng, lat] = coordsFor(region, "cx:" + c.id);
      out.push({
        id: c.id, kind: "customer", lng, lat, region, label: c.name,
        html: popupHtml("customer", c.name, [
          ["ID", c.id],
          ["Phone", c.phone],
          ["Status", humanize(c.status)],
          ["Type", humanize(c.customerType)],
          ["Partner", c.partner || "–"],
          ["Region", REGION_LABELS[region]],
        ]),
      });
    }

    for (const b of batteries) {
      const region = batteryRegion(b);
      const [lng, lat] = coordsFor(region, "bat:" + b.id);
      out.push({
        id: b.id, kind: "battery", lng, lat, region, label: b.serial,
        html: popupHtml("battery", b.serial, [
          ["ID", b.id],
          ["Status", humanize(b.status)],
          ["Location", b.currentLocation],
          ["Warehouse", b.warehouse],
          ["Firmware", "v" + b.firmwareVersion],
        ]),
      });
    }

    for (const s of SWAP_STATIONS) {
      const region = s.region as RegionKey;
      const [lng, lat] = coordsFor(region, "swap:" + s.id);
      out.push({
        id: s.id, kind: "swap_station", lng, lat, region, label: s.name,
        html: popupHtml("swap_station", s.name, [
          ["ID", s.id],
          ["Location", s.location],
          ["Region", REGION_LABELS[region]],
          ["Status", s.live ? "Live" : s.operational ? "Operational" : "Offline"],
          ["Batteries", `${s.batteriesAvailable}/${s.batteriesInstalled} available`],
          ["Demand", ratingLabel(s.rating)],
        ]),
      });
    }

    for (const f of FAST_CHARGERS) {
      const [lng, lat] = coordsFor(f.region, "fc:" + f.id);
      out.push({
        id: f.id, kind: "fast_charger", lng, lat, region: f.region, label: f.name,
        html: popupHtml("fast_charger", f.name, [
          ["ID", f.id],
          ["Region", REGION_LABELS[f.region]],
          ["Charge points", f.units],
          ["Type", "DC fast charger"],
        ]),
      });
    }

    for (const h of HOME_CHARGERS) {
      const [lng, lat] = coordsFor(h.region, "hc:" + h.id);
      out.push({
        id: h.id, kind: "home_charger", lng, lat, region: h.region, label: h.owner,
        html: popupHtml("home_charger", h.id, [
          ["Owner", h.owner],
          ["Region", REGION_LABELS[h.region]],
          ["Status", h.status === "online" ? "Online" : "Offline"],
          ["Power", h.powerKw + " kW"],
          ["Installed", h.installDate],
        ]),
      });
    }

    return out;
  }, [vehicles, customers, batteries]);
}

import { STATIONS, VEHICLES, type AssetRef, type BatteryAsset, type BatteryRecord } from "@/lib/mock/battery-tracking";

/**
 * Battery Tracking's search: serial no., IMEI, VIN or station code, ignoring
 * case and spaces, so "bs 0025", "BS0025" and "bs0025" are the same search.
 * Any part of a value matches.
 */

export const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

const assetId = (a: BatteryAsset | null) => (a === null ? "" : a.type === "station" ? a.code : a.vin);

export function matchesSearch(b: BatteryRecord, search: string): boolean {
  const term = normalize(search);
  if (!term) return true;
  return [b.serialNo, b.imei, assetId(b.asset)].some((v) => v && normalize(v).includes(term));
}

/** The vehicle or station a search names exactly, for its chip above the table. */
export function exactAsset(search: string): AssetRef | null {
  const term = normalize(search);
  if (!term) return null;
  const vehicle = VEHICLES.find((v) => normalize(v.vin) === term);
  if (vehicle) return { type: "vehicle", vin: vehicle.vin };
  const station = STATIONS.find((s) => normalize(s.code) === term);
  return station ? { type: "station", code: station.code } : null;
}

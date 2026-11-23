/** Zeno Charging list: search, filters and sort. Pure. */
import { isPublic, norm, type ChargingAsset } from "@/lib/charging/fields";

export interface ChargingFilters {
  type: string;
  status: "" | "Commissioned" | "Decommissioned" | "archived";
  access: string;
  town: string;
  country: string;
  zone: string;
  attention: boolean;
  inApp: "" | "yes" | "no";
  phase: string;
  electricity: string;
}

export const NO_FILTERS: ChargingFilters = { type: "", status: "", access: "", town: "", country: "", zone: "", attention: false, inApp: "", phase: "", electricity: "" };

export type FilterId = keyof ChargingFilters;

/** Every filter, in the order the chips and the Filters popover show them. */
export const CHARGING_FILTERS: { id: FilterId; label: string }[] = [
  { id: "type", label: "Type" },
  { id: "status", label: "Status" },
  { id: "access", label: "Access" },
  { id: "inApp", label: "In app" },
  { id: "country", label: "Country" },
  { id: "town", label: "Town" },
  { id: "zone", label: "Zone" },
  { id: "phase", label: "Phase" },
  { id: "electricity", label: "Electricity" },
  { id: "attention", label: "Needs attention" },
];

export const STATUS_LABELS: Record<ChargingFilters["status"], string> = { "": "Active (not archived)", Commissioned: "Commissioned", Decommissioned: "Decommissioned", archived: "Archived" };
export const IN_APP_LABELS: Record<ChargingFilters["inApp"], string> = { "": "All", yes: "In the app & website", no: "Not in the app" };

export const isFilterActive = (f: ChargingFilters, id: FilterId) => (id === "attention" ? f.attention : f[id] !== "");

/** What a chip shows for a filter. */
export function filterValueLabel(f: ChargingFilters, id: FilterId): string {
  if (id === "status") return STATUS_LABELS[f.status];
  if (id === "inApp") return IN_APP_LABELS[f.inApp];
  if (id === "attention") return "Yes";
  if (id === "zone") return `Zone ${f.zone}`;
  return String(f[id]);
}

export type SortKey = "assetId" | "assetName" | "site" | "town" | "goLive" | "updated";
export type Sort = { column: SortKey; direction: "asc" | "desc" };
export const DEFAULT_SORT: Sort = { column: "site", direction: "asc" };

export function matchesSearch(a: ChargingAsset, q: string): boolean {
  const s = norm(q);
  if (!s) return true;
  return [a.assetId, a.assetName, a.siteId, a.siteName, a.landmark, a.legacyName, a.area, a.road, a.town, a.partnerName]
    .some((v) => norm(v).includes(s));
}

export function matches(a: ChargingAsset, f: ChargingFilters): boolean {
  if (f.status === "archived" ? !a.archivedAt : a.archivedAt) return false;
  if (f.status && f.status !== "archived" && a.commissionStatus !== f.status) return false;
  if (f.type && a.assetType !== f.type) return false;
  if (f.access && a.accessType !== f.access) return false;
  if (f.town && a.town !== f.town) return false;
  if (f.country && a.country !== f.country) return false;
  if (f.zone && a.zone !== f.zone) return false;
  if (f.attention && !a.needsAttention) return false;
  if (f.inApp && (f.inApp === "yes") !== isPublic(a)) return false;
  if (f.phase && a.phaseType !== f.phase) return false;
  if (f.electricity && a.electricityServiceType !== f.electricity) return false;
  return true;
}

export const anyFilter = (f: ChargingFilters) => JSON.stringify(f) !== JSON.stringify(NO_FILTERS);

const key = (a: ChargingAsset, c: SortKey): string => {
  switch (c) {
    case "assetId": return a.assetId ?? "";
    case "assetName": return a.assetName;
    case "site": return `${a.siteId} ${a.assetName}`;
    case "town": return `${a.town} ${a.siteName}`;
    case "goLive": return a.goLiveDate ?? "";
    case "updated": return a.updatedAt;
  }
};

export function sortRows(rows: ChargingAsset[], sort: Sort): ChargingAsset[] {
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => key(a, sort.column).localeCompare(key(b, sort.column), undefined, { numeric: true }) * dir);
}

export function nextSort(s: Sort, column: SortKey): Sort {
  return s.column === column ? { column, direction: s.direction === "asc" ? "desc" : "asc" } : { column, direction: "asc" };
}

/** Distinct values of a field, for filter dropdowns. */
export function distinct(rows: ChargingAsset[], pick: (a: ChargingAsset) => string | null): string[] {
  return [...new Set(rows.map(pick).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

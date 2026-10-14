import type { AssetVehicle, FilterState } from "@/store/asset-tracking";

/**
 * The Immobilization dropdown keeps its original wording, but vehicles store
 * `On` / `Off` and the store matches exactly, so those two words are translated
 * on the way in and out. The request states are stored as they read.
 */
export const IMMOBILIZATION_OPTIONS = [
  "All", "Immobilized", "Mobilized",
  "ImmobilizedRequestSent", "MobilizedRequestSent",
  "ImmobilizedRequestAck", "MobilizedRequestAck",
];
export const CONNECTIVITY_OPTIONS = ["All", "Online", "Offline", "GpsOffline", "CloudOffline"];
export const STATUS_OPTIONS = ["All", "active", "new", "test", "used"];
export const TENANT_OPTIONS = [
  "All", "None",
  "fleet/greenwheels", "fleet/mkopa",
  "retail/4g", "retail/cash", "retail/fortune", "retail/safari_customer",
  "retail/tireproz", "retail/tugende", "retail/watu", "retail/zeno_captive",
  "zeno-internal/demo_bikes", "zeno-internal/pd_bikes", "zeno-internal/test_bike",
];
export const STORE_CODE_OPTIONS = [
  "All",
  "ke-jgo-mkp", "ke-nbo-grw-hq", "ke-nbo-jgo-mkp", "ke-nbo-mbsa-wtu",
  "ke-nbo-mkp", "ke-nbo-zhq", "ke-nrm-zgs", "ke-nyk-zhq",
  "ke-nyr-ctr-zhb", "ke-tmu-zgs",
];

const IMMOBILIZATION_VALUE: Record<string, string> = { Immobilized: "On", Mobilized: "Off" };

/** A dropdown word as the store's value: "Immobilized" → "On". */
export const immobilizationValue = (label: string) => IMMOBILIZATION_VALUE[label] ?? label;

/** A stored value as the dropdown's word: "On" → "Immobilized". */
export const immobilizationLabel = (value: string) =>
  Object.keys(IMMOBILIZATION_VALUE).find((k) => IMMOBILIZATION_VALUE[k] === value) ?? value;

export type SelectKey =
  | "status" | "connectivity" | "immobilization" | "tenant" | "storeCode" | "vcu" | "zeConnect" | "evcc";

/** One filter as the toolbar shows it. Odo Range is one filter over two store fields. */
export type FilterId = SelectKey | "dateOfSale" | "odo";

/**
 * Every filter, in order of importance: what a vehicle is doing now first, then
 * who it belongs to, then its history, then firmware. Pills and the Filter menu
 * both use this order, whatever order the filters were added in.
 */
export const FILTERS: { id: FilterId; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "connectivity", label: "Connectivity" },
  { id: "immobilization", label: "Immobilization" },
  { id: "tenant", label: "Tenant" },
  { id: "storeCode", label: "Store Code" },
  { id: "dateOfSale", label: "Date of Sale" },
  { id: "odo", label: "Odo Range" },
  { id: "vcu", label: "VCU" },
  { id: "zeConnect", label: "ZeConnect" },
  { id: "evcc", label: "EVCC" },
];

export function isActive(f: FilterState, id: FilterId): boolean {
  if (id === "odo") return f.odoFrom !== null || f.odoTo !== null;
  return f[id] !== "All";
}

/** The value a pill or menu row shows; the Odo text is the one the old trigger used. */
export function valueLabel(f: FilterState, id: FilterId): string {
  if (id === "odo") return `${f.odoFrom ?? 0} → ${f.odoTo ?? "∞"}`;
  if (id === "immobilization") return immobilizationLabel(f.immobilization);
  return f[id];
}

/** Options for a dropdown filter. Firmware options come from the vehicles, as before. */
export function optionsFor(id: SelectKey, vehicles: AssetVehicle[]): string[] {
  switch (id) {
    case "status": return STATUS_OPTIONS;
    case "connectivity": return CONNECTIVITY_OPTIONS;
    case "immobilization": return IMMOBILIZATION_OPTIONS;
    case "tenant": return TENANT_OPTIONS;
    case "storeCode": return STORE_CODE_OPTIONS;
    case "vcu": return getUnique(vehicles, "vcuFirmware");
    case "zeConnect": return getUnique(vehicles, "zeConnectFirmware");
    case "evcc": return getUnique(vehicles, "evccFirmware");
  }
}

function getUnique(vehicles: AssetVehicle[], key: keyof AssetVehicle): string[] {
  const vals = Array.from(new Set(vehicles.map((v) => String(v[key])))).filter(Boolean);
  vals.sort();
  return ["All", ...vals];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "07 May 2026" (how the store keeps Date of Sale) → "2026-05-07"; "" if it isn't one. */
export function labelToIso(label: string): string {
  const m = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(label);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1]}` : "";
}

/** "2026-05-07" → "07 May 2026", the same text the original date filter wrote. */
export function isoToLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

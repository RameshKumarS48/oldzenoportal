/**
 * A link to a dashboard as it's being viewed: its filters in the query
 * string, so the person opening it sees the same date range, country and
 * regions. Opening the dashboard without them shows its saved filters.
 * Pure, so it can be checked without a browser.
 */
import { parseISO, isValid } from "date-fns";
import { PROPERTIES, REGION_COUNTRY } from "./catalogue";
import { RANGE_PRESETS } from "./dates";
import type { DashboardFilters, RangePreset } from "./types";

const ALL_COUNTRIES = "all";
const PRESETS = new Set<string>([...RANGE_PRESETS.map((p) => p.value), "6m", "custom"]);
const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d\d-\d\d$/.test(s) && isValid(parseISO(s));

/**
 * "range=lastMonth&country=Kenya&regions=Nairobi,Nyeri", or with from and to
 * for a custom range. Country and regions are always written ("all", none),
 * so a link to all countries isn't read as the dashboard's saved country.
 */
export function viewQuery(f: DashboardFilters): string {
  const q = new URLSearchParams({ range: f.range.preset });
  if (f.range.preset === "custom") {
    if (f.range.from) q.set("from", f.range.from);
    if (f.range.to) q.set("to", f.range.to);
  }
  q.set("country", f.country ?? ALL_COUNTRIES);
  q.set("regions", f.regions.join(","));
  return q.toString();
}

/** The path to a dashboard showing these filters. */
export const viewLink = (id: string, f: DashboardFilters) => `/dashboards-v3/${id}?${viewQuery(f)}`;

/**
 * The filters a link asks for, on top of the dashboard's saved ones; null
 * when it asks for none. Anything that isn't a real preset, date, country
 * or region is ignored, and regions outside the country are dropped.
 */
export function filtersFromLink(get: (key: string) => string | null, saved: DashboardFilters): DashboardFilters | null {
  const range = get("range");
  const country = get("country");
  const regions = get("regions");
  if (range === null && country === null && regions === null) return null;
  const out: DashboardFilters = { range: saved.range, country: saved.country, regions: saved.regions };
  if (range && PRESETS.has(range)) {
    out.range = range === "custom"
      ? { preset: "custom", ...(isDay(get("from")) ? { from: get("from")! } : {}), ...(isDay(get("to")) ? { to: get("to")! } : {}) }
      : { preset: range as RangePreset };
  }
  if (country !== null) out.country = PROPERTIES.country.values.includes(country) ? country : country === ALL_COUNTRIES ? null : saved.country;
  if (regions !== null) out.regions = regions.split(",").filter((r) => PROPERTIES.region.values.includes(r));
  out.regions = PROPERTIES.region.values.filter((r) => out.regions.includes(r) && (!out.country || REGION_COUNTRY[r] === out.country));
  return out;
}

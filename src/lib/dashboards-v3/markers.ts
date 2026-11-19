/**
 * Events from the mock model to mark on charts over time: a dotted vertical
 * line and a short label where something explains a spike or a dip.
 */
import { bucketEnd, type ResolvedRange } from "./dates";
import { EVENTS } from "./mock-model";
import { countriesLeft, regionsLeft, type Bucket } from "./series";
import type { Grouping } from "./types";
import type { WidgetQuery } from "./widgets";

export interface Marker {
  /** The bucket's axis label, where the line is drawn. */
  x: string;
  label: string;
}

/**
 * The model's events that fall in a chart's buckets and in the places its
 * filters leave (no Nanyuki outage on a Nairobi chart), one marker per
 * bucket; events in the same bucket share it.
 */
export function markersFor(buckets: Bucket[], grouping: Grouping, range: ResolvedRange, query?: Pick<WidgetQuery, "metric" | "filters">): Marker[] {
  if (range.asOf || buckets.length < 2) return [];
  const countries = query ? countriesLeft(query.metric, query.filters) : null;
  const regions = query ? regionsLeft(query.metric, query.filters) : null;
  const out: Marker[] = [];
  for (const e of EVENTS) {
    if (e.date < range.from || e.date > range.to) continue;
    if (countries && e.country && !countries.includes(e.country)) continue;
    if (regions && e.region && !regions.includes(e.region)) continue;
    const b = buckets.find((x) => e.date >= x.start && e.date <= bucketEnd(x.start, grouping));
    if (!b) continue;
    const same = out.find((m) => m.x === b.label);
    if (same) same.label = `${same.label}, ${e.label}`;
    else out.push({ x: b.label, label: e.label });
  }
  return out;
}

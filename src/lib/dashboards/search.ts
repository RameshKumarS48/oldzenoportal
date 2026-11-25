/**
 * One search over everything that can go on a card: records, their number
 * fields and the named metrics. Paged, so it behaves the same with thirty
 * record types or three thousand. The real backend answers the same call.
 */
import type { Measure, Registry } from "./types";

export interface SearchItem {
  kind: "record" | "number" | "metric";
  key: string;
  label: string;
  /** What it belongs to or measures, in a few words. */
  sub: string;
  measure: Measure;
}

export interface SearchPage { items: SearchItem[]; total: number; hasMore: boolean }

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);

/** 3: the name starts with the query; 2: a word starts with it; 1: it appears somewhere; 0: no match. */
function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 3;
  const qs = words(q);
  const ts = words(t);
  if (qs.every((w) => ts.some((x) => x.startsWith(w)))) return 2;
  return t.includes(q) ? 1 : 0;
}

export function searchRegistry(
  reg: Registry,
  query: string,
  opts: { page?: number; pageSize?: number; canView: (recordId: string) => boolean; only?: "record" },
): SearchPage {
  const q = query.trim().toLowerCase();
  const pageSize = opts.pageSize ?? 20;
  const records = reg.records.filter((r) => opts.canView(r.id));
  const scored: { item: SearchItem; rank: number }[] = [];
  for (const r of records) {
    const rank = q ? score(r.name, q) : 1;
    if (rank) scored.push({ rank: rank + 0.2, item: { kind: "record", key: `r:${r.id}`, label: r.name, sub: r.kind === "thing" ? "Count now" : "Count over time", measure: { record: r.id, fn: "count" } } });
    // With nothing typed, only the records are listed: fields and metrics are found by searching.
    if (!q || opts.only) continue;
    for (const f of r.fields) {
      if (f.type !== "number") continue;
      // By its name, by its name with the record's ("swap amount"), or by its unit ("kwh").
      const fr = Math.max(score(f.name, q), score(`${f.name} ${r.name}`, q) && 1, f.unit && f.unit.toLowerCase() === q ? 1 : 0);
      if (fr) scored.push({ rank: fr, item: { kind: "number", key: `n:${r.id}:${f.id}`, label: f.name, sub: `Total · ${r.name}`, measure: { record: r.id, fn: "sum", field: f.id } } });
    }
  }
  if (q && !opts.only) {
    for (const m of reg.metrics) {
      if (!opts.canView(m.record)) continue;
      const rank = score(m.name, q);
      if (rank) scored.push({ rank: rank + 0.1, item: { kind: "metric", key: `m:${m.id}`, label: m.name, sub: `Metric · ${records.find((r) => r.id === m.record)?.name ?? ""}`, measure: { record: m.record, fn: "metric", metricId: m.id } } });
    }
  }
  scored.sort((a, b) => b.rank - a.rank || a.item.label.localeCompare(b.item.label));
  const start = (opts.page ?? 0) * pageSize;
  return { items: scored.slice(start, start + pageSize).map((s) => s.item), total: scored.length, hasMore: start + pageSize < scored.length };
}

/** Values of a field matching what's typed, for filter pickers. The backend serves these by typeahead. */
export function searchValues(values: string[], query: string, limit = 30): string[] {
  const q = query.trim().toLowerCase();
  return (q ? values.filter((v) => v.toLowerCase().includes(q)) : values).slice(0, limit);
}

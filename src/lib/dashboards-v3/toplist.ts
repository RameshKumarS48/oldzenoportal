/**
 * A top list's rows: the biggest items, ranked, each with its share of the
 * total and its change since the previous period, then Other. Pure, so it
 * can be checked without a browser.
 */
import type { Metric } from "./catalogue";
import { change, type Change } from "./format";
import { canStack } from "./rules";
import type { QueryResult } from "./series";

export interface TopRow {
  /** 1 for the biggest; null for Other. */
  rank: number | null;
  name: string;
  value: number;
  /** Percent of the total, Other included, so the shares add up to 100; null where figures don't add up. */
  share: number | null;
  change: Change | null;
  other: boolean;
}

export function topListRows(result: QueryResult, previous: Map<string, number> | null, metric: Metric): TopRow[] {
  const named = result.series.filter((s) => !s.other).sort((a, b) => b.total - a.total);
  const other = result.series.filter((s) => s.other);
  const whole = result.series.reduce((a, s) => a + (Number.isFinite(s.total) ? s.total : 0), 0);
  const adds = canStack(metric) && whole > 0;
  return [...named, ...other].map((s, i) => {
    const prev = previous?.get(s.name);
    return {
      rank: s.other ? null : i + 1,
      name: s.name,
      value: s.total,
      share: adds ? (s.total / whole) * 100 : null,
      change: prev !== undefined ? change(s.total, prev, metric) : null,
      other: !!s.other,
    };
  });
}

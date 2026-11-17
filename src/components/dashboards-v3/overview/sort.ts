import { categoryName } from "@/lib/dashboards-v3/catalogue";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import type { OverviewSort, SortKey } from "@/store/dashboards-v3";

export const DEFAULT_SORT: OverviewSort = { key: "lastViewed", dir: "desc" };

/** The way a column first sorts when clicked: names A to Z, counts and dates biggest or newest first. */
export const FIRST_DIR: Record<SortKey, OverviewSort["dir"]> = { name: "asc", category: "asc", visibility: "asc", widgets: "desc", lastViewed: "desc" };

/** A saved sort from before sortable headers (a plain string) reads as the default. */
export function readSort(saved: unknown): OverviewSort {
  const s = saved as Partial<OverviewSort> | null;
  return s && typeof s === "object" && s.key && s.dir ? (s as OverviewSort) : DEFAULT_SORT;
}

export function visibilityLabel(d: Dashboard): string {
  return d.isTemplate ? "Everyone" : d.visibility === "team" ? "Team" : "Only you";
}

const VALUE: Record<SortKey, (d: Dashboard) => string | number> = {
  name: (d) => d.name.toLowerCase(),
  category: (d) => categoryName(d.category),
  visibility: visibilityLabel,
  widgets: (d) => d.widgets.length,
  lastViewed: (d) => d.lastViewedAt ?? "",
};

/** Sorts by one column; ties go by name, and never-viewed dashboards stay last whichever way Last viewed sorts. */
export function sortRows(rows: Dashboard[], sort: OverviewSort): Dashboard[] {
  const value = VALUE[sort.key];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort.key === "lastViewed" && !a.lastViewedAt !== !b.lastViewedAt) return a.lastViewedAt ? -1 : 1;
    const x = value(a);
    const y = value(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return c * sign || a.name.localeCompare(b.name);
  });
}

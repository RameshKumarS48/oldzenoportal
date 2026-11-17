import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, SEED_REVISION } from "@/lib/mock/dashboards-v3";
import type { CategoryId } from "@/lib/dashboards-v3/catalogue";
import { DEFAULT_RANGE } from "@/lib/dashboards-v3/dates";
import type { Dashboard, DashboardFilters, Visibility, Widget } from "@/lib/dashboards-v3/types";

export type OverviewView = "favorites" | "mine" | "shared" | "templates" | "all";
export type OverviewSort = "lastViewed" | "name" | "created";

export interface OverviewPrefs {
  view: OverviewView;
  category: CategoryId | "all";
  sort: OverviewSort;
}

export interface NewDashboard {
  name: string;
  category: CategoryId;
  description?: string;
  visibility: Visibility;
  /** Copy the widgets and filters of this dashboard or template. */
  fromId?: string;
  /** Or start with these, e.g. from a drafted dashboard. */
  widgets?: Widget[];
  filters?: DashboardFilters;
}

interface DashboardsV3State {
  dashboards: Dashboard[];
  favorites: string[];
  /** The dashboard that opens instead of the overview, if any. */
  defaultId: string | null;
  prefs: OverviewPrefs;

  setPrefs: (patch: Partial<OverviewPrefs>) => void;
  toggleFavorite: (id: string) => void;
  setDefault: (id: string | null) => void;
  markViewed: (id: string) => void;
  create: (input: NewDashboard) => string;
  duplicate: (id: string) => string | null;
  rename: (id: string, name: string) => void;
  update: (id: string, patch: Partial<Pick<Dashboard, "name" | "description" | "category" | "visibility" | "filters" | "widgets">>) => void;
  remove: (id: string) => void;
  reset: () => void;
}

let seq = 0;
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

/** A widget copied into another dashboard: new ids, and sandbox-only errors left behind. */
function copyWidgets(widgets: Widget[]): Widget[] {
  return widgets.map((w) => {
    const copy = { ...w, id: newId("w") };
    delete copy.mockError;
    return copy;
  });
}

const initial = () => ({
  dashboards: buildSeed(Date.now()),
  favorites: ["t-revenue", "d-nairobi-ops"],
  defaultId: null as string | null,
  prefs: { view: "mine", category: "all", sort: "lastViewed" } as OverviewPrefs,
});

/**
 * Dashboards (v3) sandbox state, saved in this browser only. The persist
 * version is the seed's revision: a new seed replaces whatever was saved.
 */
export const useDashboardsV3 = create<DashboardsV3State>()(
  persist(
    (set, get) => ({
      ...initial(),

      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),

      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),

      setDefault: (id) => set({ defaultId: id }),

      markViewed: (id) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, lastViewedAt: new Date().toISOString() } : d)) })),

      create: ({ name, category, description, visibility, fromId, widgets, filters }) => {
        const source = fromId ? get().dashboards.find((d) => d.id === fromId) : undefined;
        const now = new Date().toISOString();
        const dashboard: Dashboard = {
          id: newId("d"),
          name: name.trim(),
          description: description?.trim() || undefined,
          category,
          visibility,
          owner: null,
          isTemplate: false,
          filters: filters ?? (source ? { ...source.filters, regions: [...source.filters.regions] } : { range: DEFAULT_RANGE, regions: [] }),
          widgets: widgets ? copyWidgets(widgets) : source ? copyWidgets(source.widgets) : [],
          createdAt: now,
          lastViewedAt: now,
        };
        set((s) => ({ dashboards: [dashboard, ...s.dashboards] }));
        return dashboard.id;
      },

      duplicate: (id) => {
        const source = get().dashboards.find((d) => d.id === id);
        if (!source) return null;
        return get().create({
          name: `${source.name} (copy)`,
          category: source.category,
          description: source.description,
          visibility: "private",
          fromId: id,
        });
      },

      rename: (id, name) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id && !d.isTemplate ? { ...d, name: name.trim() } : d)) })),

      update: (id, patch) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id && !d.isTemplate ? { ...d, ...patch } : d)) })),

      remove: (id) =>
        set((s) => ({
          dashboards: s.dashboards.filter((d) => d.id !== id || d.isTemplate || d.owner !== null),
          favorites: s.favorites.filter((f) => f !== id),
          defaultId: s.defaultId === id ? null : s.defaultId,
        })),

      reset: () => set(initial()),
    }),
    {
      name: "zeno-dashboards-v3",
      version: SEED_REVISION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ dashboards, favorites, defaultId, prefs }) => ({ dashboards, favorites, defaultId, prefs }),
      // A new seed revision starts everyone again from the new seed.
      migrate: () => initial(),
    }
  )
);

/** The views in the overview's left list. */
export function inView(d: Dashboard, view: OverviewView, favorites: string[]): boolean {
  switch (view) {
    case "favorites": return favorites.includes(d.id);
    case "mine": return !d.isTemplate && d.owner === null;
    case "shared": return !d.isTemplate && d.owner !== null;
    case "templates": return d.isTemplate;
    case "all": return true;
  }
}

/** Only your own dashboards can be edited, renamed, shared or deleted. */
export function isOwn(d: Dashboard): boolean {
  return !d.isTemplate && d.owner === null;
}

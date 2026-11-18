import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, SEED_REVISION } from "@/lib/mock/dashboards-v3";
import type { CategoryId } from "@/lib/dashboards-v3/catalogue";
import { DEFAULT_RANGE } from "@/lib/dashboards-v3/dates";
import { canEdit } from "@/lib/dashboards-v3/templates";
import { addWidget, atLimit } from "@/lib/dashboards-v3/widgets";
import type { Dashboard, DashboardFilters, Visibility, Widget } from "@/lib/dashboards-v3/types";

export type OverviewView = "favorites" | "mine" | "shared" | "templates" | "all";
export type SortKey = "name" | "category" | "visibility" | "widgets" | "lastViewed";
export interface OverviewSort {
  key: SortKey;
  dir: "asc" | "desc";
}

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
  /** The template it was made from, when it's an unsaved copy being saved. */
  basedOnTemplateId?: string;
}

interface DashboardsV3State {
  dashboards: Dashboard[];
  favorites: string[];
  /** The dashboard that opens instead of the overview, if any. */
  defaultId: string | null;
  prefs: OverviewPrefs;
  /** Prompts sent to the draft composer, newest first, for its Recent list. */
  recentPrompts: string[];
  /**
   * The template "Duplicate to customise" was just pressed on. Not saved in
   * the browser: a reloaded or pasted copy link finds it empty and goes back
   * to the template, so the link never creates anything.
   */
  copyIntent: string | null;
  startCopy: (templateId: string) => void;
  endCopy: () => void;

  addRecentPrompt: (prompt: string) => void;
  setPrefs: (patch: Partial<OverviewPrefs>) => void;
  toggleFavorite: (id: string) => void;
  setDefault: (id: string | null) => void;
  markViewed: (id: string) => void;
  create: (input: NewDashboard) => string;
  duplicate: (id: string) => string | null;
  rename: (id: string, name: string) => void;
  update: (id: string, patch: Partial<Pick<Dashboard, "name" | "description" | "category" | "visibility" | "filters" | "widgets">>) => void;
  remove: (id: string) => void;
  /** Explore's "Add to dashboard": a copy of the widget, at the end of its group. False for a template, someone else's dashboard, or a full one. */
  addWidgetTo: (id: string, widget: Widget) => boolean;
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
  prefs: { view: "mine", category: "all", sort: { key: "lastViewed", dir: "desc" } } as OverviewPrefs,
  recentPrompts: [] as string[],
});

const RECENT_KEPT = 10;

/**
 * Dashboards (v3) sandbox state, saved in this browser only. The persist
 * version is the seed's revision: a new seed replaces whatever was saved.
 */
export const useDashboardsV3 = create<DashboardsV3State>()(
  persist(
    (set, get) => ({
      ...initial(),
      copyIntent: null,
      startCopy: (templateId) => set({ copyIntent: templateId }),
      endCopy: () => set({ copyIntent: null }),

      addRecentPrompt: (prompt) =>
        set((s) => {
          const p = prompt.trim();
          if (!p) return s;
          return { recentPrompts: [p, ...s.recentPrompts.filter((x) => x.toLowerCase() !== p.toLowerCase())].slice(0, RECENT_KEPT) };
        }),

      setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),

      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),

      setDefault: (id) => set({ defaultId: id }),

      markViewed: (id) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, lastViewedAt: new Date().toISOString() } : d)) })),

      create: ({ name, category, description, visibility, fromId, widgets, filters, basedOnTemplateId }) => {
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
          filters: filters ?? (source ? { ...source.filters, regions: [...source.filters.regions] } : { range: DEFAULT_RANGE, country: null, regions: [] }),
          widgets: widgets ? copyWidgets(widgets) : source ? copyWidgets(source.widgets) : [],
          createdAt: now,
          lastViewedAt: now,
          // A copy remembers its template (a copy of a copy, the same one); nothing syncs between them.
          ...(source?.isTemplate ? { basedOnTemplateId: source.id } : source?.basedOnTemplateId ? { basedOnTemplateId: source.basedOnTemplateId } : basedOnTemplateId ? { basedOnTemplateId } : {}),
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

      // Rename, update and remove only ever touch your own dashboards: templates and shared ones are refused here,
      // whatever the UI offers, so no route can change them.
      rename: (id, name) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id && canEdit(d) ? { ...d, name: name.trim(), updatedAt: new Date().toISOString() } : d)) })),

      update: (id, patch) =>
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id && canEdit(d) ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)) })),

      remove: (id) =>
        set((s) => {
          const target = s.dashboards.find((d) => d.id === id);
          if (!target || !canEdit(target)) return s;
          return {
            dashboards: s.dashboards.filter((d) => d.id !== id),
            favorites: s.favorites.filter((f) => f !== id),
            defaultId: s.defaultId === id ? null : s.defaultId,
          };
        }),

      addWidgetTo: (id, widget) => {
        const target = get().dashboards.find((d) => d.id === id);
        if (!target || !canEdit(target) || atLimit(target.widgets)) return false;
        const [copy] = copyWidgets([widget]);
        set((s) => ({ dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, widgets: addWidget(d.widgets, copy), updatedAt: new Date().toISOString() } : d)) }));
        return true;
      },

      reset: () => set(initial()),
    }),
    {
      name: "zeno-dashboards-v3",
      version: SEED_REVISION,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ dashboards, favorites, defaultId, prefs, recentPrompts }) => ({ dashboards, favorites, defaultId, prefs, recentPrompts }),
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
export const isOwn = canEdit;

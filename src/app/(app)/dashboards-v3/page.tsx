"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, LayoutTemplate, Plus, RotateCcw, Search, SearchX, Star, Users } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteDialog, RenameDialog, ShareDialog } from "@/components/dashboards-v3/DashboardDialogs";
import { NewDashboardModal, type NewDashboardStart } from "@/components/dashboards-v3/NewDashboardModal";
import { copyLink } from "@/components/dashboards-v3/copyLink";
import { useCustomise } from "@/components/dashboards-v3/useCustomise";
import { DashboardsTable, dashboardHref, type RowActions } from "@/components/dashboards-v3/overview/DashboardsTable";
import { PromptBar } from "@/components/dashboards-v3/overview/PromptBar";
import { ViewList, VIEWS } from "@/components/dashboards-v3/overview/ViewList";
import { ConfirmDialog } from "@/components/dashboards-v3/ui/Dialog";
import { ClearFilters, FilterChip } from "@/components/dashboards-v3/ui/FilterChip";
import { useHydrated, useNowMinute } from "@/components/dashboards-v3/hooks";
import { CATEGORIES, categoryName } from "@/lib/dashboards-v3/catalogue";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { inView, useDashboardsV3, type OverviewView } from "@/store/dashboards-v3";
import { FIRST_DIR, readSort, sortRows } from "@/components/dashboards-v3/overview/sort";
import { toast } from "@/store/toast";


const SELECT =
  "rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";

/** Dashboards (v3) sandbox overview. Mock data only; the existing Dashboards are untouched. */
export default function DashboardsV3Page() {
  return (
    <>
      <Topbar title="Dashboards (v3)" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <Overview />
        </Suspense>
      </main>
    </>
  );
}


function Overview() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const now = useNowMinute();

  const dashboards = useDashboardsV3((s) => s.dashboards);
  const favorites = useDashboardsV3((s) => s.favorites);
  const defaultId = useDashboardsV3((s) => s.defaultId);
  const prefs = useDashboardsV3((s) => s.prefs);
  const setPrefs = useDashboardsV3((s) => s.setPrefs);
  // A link to one list (the dashboard page's breadcrumb) opens the overview on it.
  const viewParam = params.get("view");
  useEffect(() => {
    if (viewParam && VIEWS.some((v) => v.id === viewParam)) setPrefs({ view: viewParam as OverviewView });
  }, [viewParam, setPrefs]);
  const toggleFavorite = useDashboardsV3((s) => s.toggleFavorite);
  const setDefault = useDashboardsV3((s) => s.setDefault);
  const duplicate = useDashboardsV3((s) => s.duplicate);
  const reset = useDashboardsV3((s) => s.reset);

  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<Dashboard | null>(null);
  const [sharing, setSharing] = useState<Dashboard | null>(null);
  const [deleting, setDeleting] = useState<Dashboard | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newStart, setNewStart] = useState<NewDashboardStart | null>(null);
  const [newKey, setNewKey] = useState(0);
  const openNew = (start: NewDashboardStart) => { setNewKey((k) => k + 1); setNewStart(start); };

  // A default dashboard opens instead of the overview, except when coming back to the list.
  const defaultExists = defaultId !== null && dashboards.some((d) => d.id === defaultId);
  const landing = hydrated && params.get("list") === null && defaultExists ? defaultId : null;
  useEffect(() => {
    if (landing) router.replace(`/dashboards-v3/${landing}`);
  }, [landing, router]);
  // A default that was deleted or is no longer shared falls back to this list, and says so once.
  useEffect(() => {
    if (!hydrated || defaultId === null || defaultExists) return;
    setDefault(null);
    toast.info("Your default dashboard is no longer available", "Dashboards (v3) opens on this list until you set another default.");
  }, [hydrated, defaultId, defaultExists, setDefault]);

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((v) => [v.id, dashboards.filter((d) => inView(d, v.id, favorites)).length])) as Record<OverviewView, number>,
    [dashboards, favorites]
  );

  const sort = readSort(prefs.sort);
  const query = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      sortRows(
        dashboards.filter(
          (d) =>
            inView(d, prefs.view, favorites) &&
            (prefs.category === "all" || d.category === prefs.category) &&
            (!query || d.name.toLowerCase().includes(query) || (d.description ?? "").toLowerCase().includes(query))
        ),
        sort
      ),
    [dashboards, favorites, prefs, sort, query]
  );
  const filtered = prefs.category !== "all" || query !== "";
  const clearFilters = () => { setSearch(""); setPrefs({ category: "all" }); };


  const { customise, prompt: copyPrompt } = useCustomise();
  const templateNames = useMemo(() => Object.fromEntries(dashboards.filter((d) => d.isTemplate).map((d) => [d.id, d.name])), [dashboards]);

  const actions: RowActions = {
    open: (d) => router.push(dashboardHref(d)),
    rename: setRenaming,
    share: setSharing,
    remove: setDeleting,
    duplicate: (d) => {
      duplicate(d.id);
      toast.success("Duplicated", `“${d.name} (copy)” is in Your dashboards.`);
    },
    customise: (d) => customise(d),
    copyLink: (d) => { void copyLink(dashboardHref(d), d.name); },
    toggleDefault: (d) => {
      const on = defaultId !== d.id;
      setDefault(on ? d.id : null);
      toast.success(on ? "Set as default" : "Removed as default", on ? `“${d.name}” opens when you open Dashboards (v3).` : "Dashboards (v3) opens on this list.");
    },
  };

  const noneOfYourOwn = prefs.view === "mine" && counts.mine === 0;
  const defaultName = dashboards.find((d) => d.id === defaultId)?.name;

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-800">Dashboards</h2>
          <p className="text-xs text-slate-500">
            Sandbox with mock data.
            {defaultName && <> Opens on <span className="font-medium text-slate-700">{defaultName}</span> by default.</>}
          </p>
        </div>
        <Button onClick={() => openNew({ step: 1 })}>
          <Plus className="h-4 w-4" />
          New dashboard
        </Button>
      </div>

      <div className="flex flex-1 gap-5 overflow-auto bg-zeno-bg p-5">
        {!hydrated || landing ? null : (
          <>
            <aside className="flex w-56 shrink-0 flex-col justify-between">
              <ViewList active={prefs.view} counts={counts} onChange={(view) => setPrefs({ view })} />
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 self-start rounded px-3 py-1 text-xs text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset sandbox data
              </button>
            </aside>

            {/* The composer sits above the table card, on exactly its edges. */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
            <PromptBar />
            <section className="flex min-h-[460px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
                <div className="relative w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search dashboards"
                    aria-label="Search dashboards"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-500 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
                  />
                </div>
                <select
                  aria-label="Category"
                  value={prefs.category}
                  onChange={(e) => setPrefs({ category: e.target.value as typeof prefs.category })}
                  className={SELECT}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {filtered && (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    {prefs.category !== "all" && <FilterChip label="Category" value={categoryName(prefs.category)} onRemove={() => setPrefs({ category: "all" })} />}
                    {query && <FilterChip label="Search" value={search.trim()} onRemove={() => setSearch("")} />}
                    <ClearFilters onClick={clearFilters} />
                  </div>
                )}
              </div>

              <div className={cn("flex-1 overflow-auto", rows.length === 0 && "grid place-items-center")}>
                {rows.length === 0 && filtered ? (
                  <EmptyState
                    icon={SearchX}
                    title="No dashboards match your filters"
                    description="Try another search or category."
                    action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
                  />
                ) : noneOfYourOwn ? (
                  <EmptyState
                    icon={LayoutDashboard}
                    title="Start your first dashboard"
                    description="Begin from a Zeno template and change what you need, or start from a blank page."
                    action={
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPrefs({ view: "templates" })}>
                          <LayoutTemplate className="h-4 w-4" /> Browse templates
                        </Button>
                        <Button variant="teal" size="sm" onClick={() => openNew({ step: 2, kind: "blank" })}>
                          <Plus className="h-4 w-4" /> Blank dashboard
                        </Button>
                      </div>
                    }
                  />
                ) : rows.length === 0 && prefs.view === "favorites" ? (
                  <EmptyState icon={Star} title="No favorites yet" description="Star a dashboard to keep it here." />
                ) : rows.length === 0 ? (
                  <EmptyState icon={Users} title="Nothing shared with you yet" description="Dashboards your team shares with you will show here." />
                ) : (
                  <DashboardsTable
                    rows={rows}
                    favorites={favorites}
                    defaultId={defaultId}
                    now={now}
                    onToggleFavorite={toggleFavorite}
                    sort={sort}
                    onSort={(key) => setPrefs({ sort: sort.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: FIRST_DIR[key] } })}
                    actions={actions}
                    templateNames={templateNames}
                  />
                )}
              </div>
            </section>
            </div>
          </>
        )}
      </div>

      <RenameDialog key={`rename-${renaming?.id}`} dashboard={renaming} onClose={() => setRenaming(null)} />
      <ShareDialog key={`share-${sharing?.id}`} dashboard={sharing} onClose={() => setSharing(null)} />
      <DeleteDialog dashboard={deleting} onClose={() => setDeleting(null)} />
      <NewDashboardModal key={newKey} start={newStart} onClose={() => setNewStart(null)} />
      {copyPrompt}
      <ConfirmDialog
        open={confirmReset}
        tone="neutral"
        title="Reset sandbox data"
        confirmLabel="Reset"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setSearch("");
          setConfirmReset(false);
          toast.success("Sandbox data reset", "Templates, sample dashboards and favorites are back to the start.");
        }}
      >
        Every dashboard you made or changed here goes back to the sample data. This only affects this browser.
      </ConfirmDialog>
    </>
  );
}

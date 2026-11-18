"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startOfDay } from "date-fns";
import { ChevronDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { metricById, PROPERTIES, type CategoryId, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { previousPeriod } from "@/lib/dashboards-v3/dates";
import { compareBlocked, normalise } from "@/lib/dashboards-v3/editor";
import { asShares, EXPLORE_PATH, exploreChartOptions, exploreFromParams, exploreQuery, markersFor, sharesMetric, summaryOf, valuesShown, type Display } from "@/lib/dashboards-v3/explore";
import { runQuery } from "@/lib/dashboards-v3/series";
import { canEdit } from "@/lib/dashboards-v3/templates";
import type { Dashboard, DashboardFilters, Widget } from "@/lib/dashboards-v3/types";
import { viewQuery } from "@/lib/dashboards-v3/view-link";
import { replaceWidget, widgetQuery } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { isOwn, useDashboardsV3 } from "@/store/dashboards-v3";
import { toast } from "@/store/toast";
import { copyLink } from "../copyLink";
import { MetricPicker } from "../editor/MetricPicker";
import { useHydrated, useNowMinute } from "../hooks";
import { previousByValue } from "../page/WidgetCard";
import { Breadcrumb, dashboardCrumbs } from "../ui/Breadcrumb";
import { BarWidget } from "../widgets/BarWidget";
import { LineWidget } from "../widgets/LineWidget";
import { StackedBarWidget } from "../widgets/StackedBarWidget";
import { TableWidget } from "../widgets/TableWidget";
import { ExploreFilters } from "./ExploreFilters";
import { AddToDashboard, BreakdownChips, ChartSwitch, DisplaySection, SummaryRow } from "./ExploreParts";

const CHART_PX = 360;
const CARD = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

/**
 * Explore: one question on a page of its own, everything in the URL so it
 * can be reloaded, shared or gone back from. Controls on the left, filters
 * included, scroll on their own; the results on the right are the summary
 * (number, change, Copy summary), a large chart with the events that match
 * its filters marked, then the values by breakdown, or the data by date
 * behind "Show data". Nothing here changes a dashboard except Add to
 * dashboard (your own) and Update this widget (on your own dashboard).
 */
export function ExploreView() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const now = useNowMinute();
  const dashboards = useDashboardsV3((s) => s.dashboards);
  const { addWidgetTo, update, create } = useDashboardsV3.getState();
  const today = useMemo(() => startOfDay(now ? new Date(now) : new Date()), [now]);
  const [showData, setShowData] = useState(false);

  const state = useMemo(() => exploreFromParams((k) => params.get(k), dashboards), [params, dashboards]);
  const { dashboard, widgetId, widget, filters, backFilters, display } = state;
  const metric = metricById(widget.metricId);
  const query = useMemo(() => widgetQuery(widget, filters, today), [widget, filters, today]);
  const result = useMemo(() => (query ? runQuery(query) : null), [query]);
  // The summary always says how it changed; the chart draws the previous period only when Compare is on.
  const previous = useMemo(() => (query ? runQuery({ ...query, range: previousPeriod(query.range), top: Infinity }) : null), [query]);

  if (!hydrated) return null;

  /** Every change is a new URL: the page reads its state from there. */
  function go(next: { widget?: Widget; filters?: DashboardFilters; display?: Display; picked?: boolean }) {
    const q = exploreQuery({
      dashboardId: dashboard?.id ?? null, widgetId, widget: next.widget ?? widget, filters: next.filters ?? filters, backFilters,
      display: next.display ?? display, picked: next.picked ?? state.picked,
    });
    router.replace(`${EXPLORE_PATH}?${q}`, { scroll: false });
  }
  /** The widget with the Display options as last chosen; the chart then drops any it doesn't use. */
  const withDisplay = (w: Widget, d: Display): Widget =>
    normalise({ ...w, compare: d.compare, grouping: d.grouping, sort: d.sort, showValues: valuesShown(w.type, d) }, true);
  const set = (patch: Partial<Widget>) => go({ widget: withDisplay({ ...widget, ...patch }, display) });
  function setDisplay(patch: Partial<Display>) {
    const next = { ...display, ...patch };
    go({ widget: withDisplay(widget, next), display: next });
  }
  /**
   * A new breakdown: the chart follows the recommendation (worked out from the
   * URL) unless the person picked one. No breakdown with bars or stacks picked
   * goes back to the recommendation, since those need something to break down.
   */
  function setSplit(p: PropertyId | undefined) {
    if (!metric) return;
    const needsSplit = widget.type === "bar" || widget.type === "stacked";
    go({ widget: withDisplay({ ...widget, splitBy: p, type: p || !needsSplit ? widget.type : "line" }, display), picked: !p && needsSplit ? false : state.picked });
  }

  const own = dashboards.filter(isOwn);
  const forAdding: Widget = { ...widget, title: widget.title || metric?.name || "Widget" };
  function addTo(d: Dashboard) {
    if (addWidgetTo(d.id, forAdding)) toast.success("Added to dashboard", `“${forAdding.title}” is now on “${d.name}”.`);
    else toast.error("Couldn’t add the widget", "That dashboard is full or isn’t yours.");
  }
  function createWith(name: string, category: CategoryId) {
    create({ name, category, visibility: "private", filters, widgets: [forAdding] });
    toast.success("Dashboard created", `“${name}” is in Your dashboards, with this widget on it.`);
  }
  const canUpdate = !!dashboard && canEdit(dashboard) && !!widgetId && dashboard.widgets.some((w) => w.id === widgetId);
  function updateWidget() {
    if (!dashboard || !widgetId) return;
    update(dashboard.id, { widgets: replaceWidget(dashboard.widgets, { ...forAdding, id: widgetId, size: dashboard.widgets.find((w) => w.id === widgetId)!.size }) });
    toast.success("Widget updated", `“${forAdding.title}” on “${dashboard.name}”.`);
    router.push(`/dashboards-v3/${dashboard.id}?${viewQuery(filters)}`);
  }

  const crumbs = dashboard
    ? [...dashboardCrumbs(dashboard), { label: dashboard.name, href: `/dashboards-v3/${dashboard.id}?${viewQuery(backFilters)}` }, { label: "Explore" }]
    : [{ label: "Dashboards", href: "/dashboards-v3?list=1" }, { label: "Explore" }];
  const ready = metric && query && result;
  const showing = ready && !result.empty && !query.noOverlap;
  const overTime = widget.type === "line" || widget.type === "stacked";
  // Event markers only where they're drawn (lines and stacks over time), and only for the places the filters leave.
  const markers = showing && overTime ? markersFor(result.buckets, query.grouping, query.range, query) : [];
  // A line broken down hides Other unless asked; bars and tables keep it as their last row.
  const hasOther = showing && widget.type === "line" && !!query.splitBy && result.series.some((x) => x.other);
  const lineResult = hasOther && !display.other ? { ...result, series: result.series.filter((x) => !x.other) } : result;
  // Show as % of total: each value as its share of its bar (stacked) or of the whole (bars).
  const adds = !!metric && metric.unit !== "%" && metric.aggregation !== "ratio" && metric.aggregation !== "average";
  const percent = showing && display.percent && adds && (widget.type === "stacked" || (widget.type === "bar" && !!query.splitBy));
  const shown = percent ? asShares(result) : result;
  const shownMetric = percent ? sharesMetric(metric) : metric;
  const compareShown = (widget.type === "line" || widget.type === "table") && !compareBlocked({ ...widget, compare: true });
  const previousLine = widget.compare && showing && widget.type === "line" && !query.splitBy ? runQuery({ ...query, range: previousPeriod(query.range) }).series[0].values : null;
  const byValue = showing && query.splitBy && previous ? previousByValue(result, previous, metric.unit !== "%" && metric.aggregation === "sum") : null;

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-start gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-6 py-3">
        <div className="min-w-0 flex-1">
          <Breadcrumb items={crumbs} />
          <h2 className="mt-0.5 truncate text-base font-semibold text-slate-800">{metric?.name ?? "Explore"}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">Explore · Changes here don’t affect any dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { void copyLink(`${EXPLORE_PATH}?${params.toString()}`, metric?.name ?? "Explore"); }}>
            <Link2 className="h-4 w-4" /> Copy link
          </Button>
          <AddToDashboard own={own} widget={metric ? forAdding : null} metric={metric} onAdd={addTo} onCreate={createWith} />
          {canUpdate && <Button variant="teal" size="sm" disabled={!metric} onClick={updateWidget}>Update this widget</Button>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Controls scroll on their own, so the results never move under them. */}
        {/* Each section its own block, divided by a hairline: a muted heading, then the controls. */}
        <aside aria-label="Explore controls" className="w-[360px] shrink-0 divide-y divide-slate-200 overflow-y-auto border-r border-slate-200 bg-white px-4 [&>*]:py-4">
          <MetricPicker compact value={metric} category={dashboard?.category ?? metric?.category ?? "swaps"} onChange={(m) => set({ metricId: m.id })} />
          {metric && (
            <>
              <BreakdownChips metric={metric} type={widget.type} value={widget.splitBy} onChange={setSplit} />
              <ExploreFilters
                metric={metric}
                filters={filters}
                saved={backFilters}
                onFilters={(f) => go({ filters: f })}
                extra={widget.filters ?? []}
                onExtra={(f) => set({ filters: f })}
                noOverlap={!!query?.noOverlap}
              />
              <ChartSwitch
                widget={widget}
                options={exploreChartOptions(metric, widget.splitBy)}
                recommended={state.recommended}
                onChange={(type) => go({ widget: withDisplay({ ...widget, type }, display), picked: true })}
              />
              <DisplaySection widget={widget} metric={metric} display={display} onDisplay={setDisplay} compareShown={compareShown} />
            </>
          )}
        </aside>

        <section aria-label="Results" className="min-w-0 flex-1 space-y-4 overflow-y-auto bg-zeno-bg p-5">
          {!ready ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">Choose a metric on the left to explore it.</p>
          ) : (
            <>
              <SummaryRow metric={metric} summary={summaryOf(query, result, previous)} />

              {showing && (
                <div className={CARD}>
                  {widget.type === "line" ? (
                    <LineWidget metric={metric} result={lineResult ?? result} previous={previousLine} splitBy={query.splitBy} goal={widget.goal} showValues={widget.showValues} minHeight={CHART_PX} fill={false} markers={markers} />
                  ) : widget.type === "bar" ? (
                    <BarWidget metric={shownMetric!} series={shown!.series} sort={widget.sort} goal={percent ? undefined : widget.goal} splitBy={query.splitBy} minHeight={CHART_PX} showValues={valuesShown("bar", display)} />
                  ) : widget.type === "stacked" ? (
                    <StackedBarWidget metric={shownMetric!} result={shown!} splitBy={query.splitBy} goal={percent ? undefined : widget.goal} showValues={widget.showValues} minHeight={CHART_PX} fill={false} markers={markers} />
                  ) : (
                    <div className="max-w-[720px]">
                      <TableWidget metric={metric} result={result} splitBy={query.splitBy} sort={query.splitBy ? "desc" : "name"} previous={byValue} maxHeight={CHART_PX + 120} />
                    </div>
                  )}
                  {hasOther && (
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={display.other} onChange={(e) => setDisplay({ other: e.target.checked })} className="h-3.5 w-3.5 rounded border-slate-300 accent-[#003B49]" />
                      Show Other
                    </label>
                  )}
                  {markers.length > 0 && <p className="mt-2 text-xs text-slate-500">Dotted lines mark events: {markers.map((m) => m.label).join(", ")}.</p>}
                </div>
              )}

              {/* The values by breakdown, biggest first; with no breakdown, the data by date behind "Show data". The table chart already is the table. */}
              {showing && widget.type !== "table" && (query.splitBy ? (
                <div className={CARD}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">By {PROPERTIES[query.splitBy].name.toLowerCase()}</h3>
                  <TableWidget metric={metric} result={result} splitBy={query.splitBy} sort="desc" previous={byValue} maxHeight={480} />
                </div>
              ) : (
                <div className="max-w-[720px]">
                  <button
                    type="button"
                    aria-expanded={showData}
                    onClick={() => setShowData((s) => !s)}
                    className="inline-flex items-center gap-1 rounded text-sm font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", !showData && "-rotate-90")} aria-hidden /> {showData ? "Hide data" : "Show data"}
                  </button>
                  {showData && (
                    <div className={cn(CARD, "mt-2")}>
                      <TableWidget metric={metric} result={result} sort="name" previous={null} maxHeight={480} />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}

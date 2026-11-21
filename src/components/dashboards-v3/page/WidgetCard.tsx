"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, BookOpen, Copy, Download, FilterX, Maximize2, Pencil, RotateCw, Trash2 } from "lucide-react";
import { metricById, PROPERTIES } from "@/lib/dashboards-v3/catalogue";
import { fmtAsOf, fmtSpan, GROUPING_LABEL, previousDates, previousPeriod, rangeWithDates } from "@/lib/dashboards-v3/dates";
import { showsUnitTag, UNIT_LABEL } from "@/lib/dashboards-v3/format";
import { allowedSizes, SIZE_LABEL, TOP_LIST_ALL } from "@/lib/dashboards-v3/rules";
import { topListRows } from "@/lib/dashboards-v3/toplist";
import { asShares, runQuery, sharesMetric, type QueryResult } from "@/lib/dashboards-v3/series";
import type { DashboardFilters, PropertyFilter, Widget, WidgetSize } from "@/lib/dashboards-v3/types";
import { contextLine, filterLine, SPAN, SPAN_COMPACT, widgetQuery } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { safeFileName, toCsv, widgetTable } from "@/lib/dashboards-v3/export";
import { toast } from "@/store/toast";
import { DefinitionDialog } from "./DefinitionDialog";
import { DefinitionTip, FocusTip } from "../ui/FocusTip";
import { BreakdownTabs } from "../ui/BreakdownTabs";
import { Dialog } from "../ui/Dialog";
import { RowMenu, type MenuItem } from "../ui/RowMenu";
import { BarWidget } from "../widgets/BarWidget";
import { KpiWidget } from "../widgets/KpiWidget";
import { LineWidget } from "../widgets/LineWidget";
import { StackedBarWidget } from "../widgets/StackedBarWidget";
import { TableWidget } from "../widgets/TableWidget";
import { TopListWidget } from "../widgets/TopListWidget";

const GRID_CHART_PX = 220;
const UNIT_TAG = "inline-flex rounded border border-slate-200 px-1.5 text-[11px] leading-4 text-slate-600";
/** How long the sandbox pretends a widget takes to load, so the loading state can be seen. */
const LOAD_MS = 450;

export interface WidgetCardProps {
  widget: Widget;
  filters: DashboardFilters;
  today: Date;
  /** Edit mode (your own dashboards only): rename on click; ⋯ has Edit, Duplicate widget, Move up and down, Size and Remove. */
  editing: boolean;
  /** Your own dashboard: in view mode, ⋯ also offers Edit, which opens edit mode with this widget in the panel. */
  canChange: boolean;
  failed: boolean;
  moveUpBlocked: string | null;
  moveDownBlocked: string | null;
  onRetry: () => void;
  onResetFilters: () => void;
  onRename: (title: string) => void;
  onMove: (dir: -1 | 1) => void;
  onResize: (size: WidgetSize) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** placeholder: a new widget not added yet; editing: open in the panel; added: just added, briefly. */
  mark?: "placeholder" | "editing" | "added";
  /** Another widget is open in the panel: this one fades back and can't be used until the panel closes. */
  dimmed?: boolean;
  /** The grid is two columns while the panel is open. */
  compact?: boolean;
  /** Sizing from the parent instead of the grid spans: number widgets share their row in a flex layout. */
  sizeClass?: string;
}

/**
 * One widget: title (renamed by clicking it in edit mode), the metric's
 * definition behind ⓘ, its unit, the chart, and when the data is from.
 * Loading, no data and error each have their own state.
 */
export function WidgetCard(props: WidgetCardProps) {
  const { filters, today, editing, canChange, failed } = props;
  const saved = props.widget;
  // The breakdown tab this viewer chose: for this visit only, never saved, not a filter change.
  const [tab, setTab] = useState<Widget["splitBy"]>(undefined);
  const tabs = saved.switchable && saved.switchable.length >= 2 && saved.splitBy ? saved.switchable : null;
  const widget: Widget = useMemo(() => (tabs && tab && tabs.includes(tab) ? { ...saved, splitBy: tab } : saved), [saved, tabs, tab]);
  // A top list shows its top 8, or up to 20 with Show all.
  const [expanded, setExpanded] = useState(false);
  const [rowsOf, setRowsOf] = useState<string | null>(null);
  const baseMetric = metricById(widget.metricId);
  // % of total: every figure, axis and tooltip as a share.
  const metric = baseMetric && widget.percent ? sharesMetric(baseMetric) : baseMetric;
  const query = useMemo(() => {
    const q = widgetQuery(widget, filters, today);
    return q && widget.type === "toplist" && expanded ? { ...q, top: TOP_LIST_ALL } : q;
  }, [widget, filters, today, expanded]);

  // A new query "loads" briefly; the signature is everything that changes the numbers.
  const signature = JSON.stringify([widget.metricId, widget.type, widget.range, widget.filters, widget.splitBy, widget.grouping, widget.compare, widget.percent, filters, failed, expanded]);
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(signature), LOAD_MS);
    return () => clearTimeout(id);
  }, [signature]);
  const loading = loaded !== signature;

  const result = useMemo(() => (query ? (widget.percent ? asShares(runQuery(query)) : runQuery(query)) : null), [query, widget.percent]);
  const previous = useMemo(() => {
    // A top list always shows each item's change.
    if (!query || (!widget.compare && widget.type !== "toplist")) return null;
    // Every value, not just the top ones: a value can be in this period's top 8 but not the last one's.
    return runQuery({ ...query, range: previousPeriod(query.range), top: Infinity });
  }, [query, widget.compare, widget.type]);
  const context = useMemo(() => contextLine(widget, filters, today), [widget, filters, today]);

  const CHART_PX = GRID_CHART_PX;
  const titleId = `widget-${widget.id}-title`;
  const isText = widget.type === "text";
  const asOf = query?.range.asOf;
  const compared = !!previous && ((widget.type === "line" && !query?.splitBy) || (widget.type === "table" && !!query?.splitBy));
  const snapshotOverTime = metric?.kind === "snapshot" && !asOf;
  // The footer says what's different from the dashboard (its own period with exact dates, a current value
  // the date range doesn't apply to, its grouping, what it's compared with), then notes on what the figure is.
  const footerParts = !isText && query && metric
    ? [
        asOf ? `As of ${fmtAsOf(asOf)}` : widget.range && rangeWithDates(widget.range, today),
        asOf && "Date range doesn’t apply",
        snapshotOverTime && `End-of-${query.grouping} value`,
        widget.grouping && !asOf && widget.type !== "kpi" && widget.type !== "bar" && GROUPING_LABEL[widget.grouping],
        compared && (widget.type === "line"
          ? `Previous period: ${fmtSpan(previousPeriod(query.range).from, previousPeriod(query.range).to)}`
          : `Change ${previousDates(query.range)}`),
        query.byCountry && "Shown by country; currencies aren’t combined",
        query.splitSetAside && `Choose one country to see it by ${PROPERTIES[query.splitSetAside].name.toLowerCase()}`,
        result && result.ignored.length > 0 && `${result.ignored.map((p) => PROPERTIES[p].name).join(" and ")} filter doesn’t apply to this metric`,
        // Said once: a number's context line already shows its excludes note when it has no other.
        !context?.fromExcludes && metric.excludes,
      ].filter((x): x is string => !!x)
    : [];
  const filtered = filterLine(widget);
  const footer = footerParts.length > 0 ? footerParts : null;
  const [showDefinition, setShowDefinition] = useState(false);

  function exportCsv() {
    if (!result || !metric) return;
    // The same columns as this widget's sheet in the dashboard's Excel export.
    const csv = toCsv(widgetTable(result, metric, query?.splitBy));
    // A BOM so Excel reads the file as UTF-8 (en dashes, accents).
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${safeFileName(widget.title || "widget") || "widget"}.csv` });
    a.click();
    // Revoked after the click has started the download; Safari can fail if it's revoked at once.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Exported CSV", "Sandbox file with mock data.");
  }

  const definition: MenuItem[] = metric ? [{ label: "View definition", icon: BookOpen, onSelect: () => setShowDefinition(true) }] : [];
  const exportItem: MenuItem[] = !isText ? [{ label: "Export CSV (mock)", icon: Download, onSelect: exportCsv }] : [];
  /** One item of the breakdown: the widget filtered to it, with no breakdown. */
  const onlyItem = (name: string): Widget => {
    const split = widget.splitBy!;
    const keep: PropertyFilter[] = (widget.filters ?? []).filter((f) => f.property !== split);
    return { ...widget, splitBy: undefined, switchable: undefined, percent: undefined, filters: [...keep, { property: split, values: [name] }].slice(-3) };
  };
  const bodyId = `widget-${widget.id}-body`;
  // View mode never changes the saved dashboard: Edit is the way into changing it, on your own dashboards only.
  // Templates and dashboards shared with you get just View definition and Export CSV.
  const menu: MenuItem[] = editing
    ? [
        { label: "Edit", icon: Pencil, onSelect: props.onEdit },
        { label: "Duplicate widget", icon: Copy, onSelect: props.onDuplicate },
        { label: "Move up", icon: ArrowUp, onSelect: () => props.onMove(-1), blocked: props.moveUpBlocked },
        { label: "Move down", icon: ArrowDown, onSelect: () => props.onMove(1), blocked: props.moveDownBlocked },
        {
          label: "Size",
          icon: Maximize2,
          choices: allowedSizes(widget.type).map((size) => ({ label: SIZE_LABEL[size], checked: widget.size === size, onSelect: () => props.onResize(size) })),
        },
        { label: "Remove", icon: Trash2, onSelect: props.onRemove, danger: true },
      ]
    : [...definition, ...exportItem, ...(canChange ? [{ label: "Edit", icon: Pencil, onSelect: props.onEdit }] : [])];

  return (
    <article
      id={`widget-card-${widget.id}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-busy={loading && !isText}
      inert={props.dimmed}
      className={cn(
        // The shared Card's look (ui/card.tsx): light border, subtle shadow, roomier padding.
        // Scrolled into view (to edit, or just added), it stops below the sticky filter bar.
        "flex min-w-0 scroll-mb-6 scroll-mt-28 flex-col rounded-xl border bg-white shadow-sm transition-shadow focus:outline-none",
        props.sizeClass ?? (props.compact ? SPAN_COMPACT : SPAN)[widget.size],
        editing ? "border-dashed border-slate-300" : "border-slate-200",
        props.mark === "placeholder" && "border-2 border-dashed border-zeno-teal",
        props.mark === "editing" && "border-zeno-teal ring-2 ring-zeno-teal/30",
        props.dimmed && "pointer-events-none opacity-50",
        props.mark === "added" && "ring-2 ring-zeno-teal ring-offset-2"
      )}
    >
      {props.mark && props.mark !== "added" && (
        <p className="px-5 pt-3 text-xs font-medium text-zeno-teal">{props.mark === "placeholder" ? "New widget · preview" : "Editing in the panel"}</p>
      )}
      <header className="flex items-start gap-2 px-5 pb-3 pt-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
          <WidgetTitle id={titleId} title={widget.title} editing={editing && !props.mark} onRename={props.onRename} />
          {metric && <FocusTip label={`What ${metric.name} means`} content={<DefinitionTip metric={metric} />} />}
          {/* A number already says its unit after the figure ("412.2K points", "97.2%"), so only charts and tables get the tag. */}
          {metric && !isText && widget.type !== "kpi" && showsUnitTag(metric) && <span className={UNIT_TAG}>{UNIT_LABEL[metric.unit]}</span>}
          {filtered && !isText && <p className="basis-full truncate text-xs text-slate-500" title={filtered}><span className="sr-only">Filtered to </span>{filtered}</p>}
          {tabs && !isText && (
            <BreakdownTabs idBase={`widget-${widget.id}`} options={tabs} value={widget.splitBy!} onChange={(p) => setTab(p)} panelId={bodyId} />
          )}
        </div>
        {menu.length > 0 && !props.mark && <RowMenu label={`Actions for ${widget.title || "widget"}`} items={menu} className="-mr-1.5 -mt-1 shrink-0" />}
      </header>

      {/* A flex column, so line and stacked charts can grow into a card stretched by a taller neighbour. */}
      <div
        id={bodyId}
        role={tabs ? "tabpanel" : undefined}
        aria-labelledby={tabs ? `widget-${widget.id}-tab-${widget.splitBy}` : undefined}
        className={cn("flex min-w-0 flex-1 flex-col px-5", isText || !footer ? "pb-5" : "pb-3")}
      >
        {isText ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{widget.text || <span className="italic text-slate-500">No text yet</span>}</p>
        ) : failed ? (
          <State icon={AlertCircle} tone="error" title="Couldn’t load this widget" detail="The data didn’t arrive. Try again in a moment." action={{ label: "Retry", icon: RotateCw, onClick: props.onRetry }} />
        ) : !metric ? (
          <p className="flex min-h-[96px] items-center justify-center text-sm text-slate-500">Pick a metric to preview</p>
        ) : loading || !query || !result ? (
          <Skeleton type={widget.type} height={CHART_PX} />
        ) : query.noOverlap ? (
          <State
            icon={FilterX}
            title="No data: widget and dashboard filters don’t overlap"
            detail={`The dashboard shows ${[filters.country, ...filters.regions].filter(Boolean).join(", ")}; this widget shows ${filtered}.`}
            action={canChange || editing ? { label: "Edit widget", icon: Pencil, onClick: props.onEdit } : undefined}
          />
        ) : result.empty ? (
          <State icon={FilterX} title="No data for this filter" detail="Nothing matches the dashboard’s filters for this metric." action={{ label: "Reset filters", icon: RotateCw, onClick: props.onResetFilters }} />
        ) : widget.type === "kpi" ? (
          <KpiWidget metric={metric} result={result} previous={previous} range={query.range} compare={widget.compare} context={context?.text} />
        ) : widget.type === "line" ? (
          <LineWidget
            metric={metric}
            result={result}
            previous={previous && !query.splitBy ? previous.series[0].values : null}
            splitBy={query.splitBy}
            goal={widget.goal}
            showValues={widget.showValues}
            minHeight={CHART_PX}
            fill
          />
        ) : widget.type === "bar" ? (
          <BarWidget metric={metric} series={result.series} sort={widget.sort} goal={widget.goal} splitBy={query.splitBy} />
        ) : widget.type === "stacked" ? (
          <StackedBarWidget metric={metric} result={result} splitBy={query.splitBy} goal={widget.goal} showValues={widget.showValues} minHeight={CHART_PX + 24} fill />
        ) : widget.type === "toplist" ? (
          <TopListWidget
            metric={metric}
            rows={topListRows(result, previous && query.splitBy ? previousByValue(result, previous, metric.unit !== "%" && metric.aggregation === "sum") : null, metric)}
            property={query.splitBy ? PROPERTIES[query.splitBy].name : "Item"}
            onViewRows={setRowsOf}
            showAll={expanded || result.series.some((x) => x.other) ? { expanded, onToggle: () => setExpanded((e) => !e) } : null}
          />
        ) : (
          <TableWidget
            metric={metric}
            result={result}
            splitBy={query.splitBy}
            sort={widget.sort}
            previous={previous && query.splitBy ? previousByValue(result, previous, metric.unit !== "%" && metric.aggregation === "sum") : null}
            maxHeight={CHART_PX + 40}
          />
        )}
      </div>

      {footer && (
        <footer className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
          {footer.map((part, i) => (
            <span key={part} className="contents">
              {i > 0 && <span aria-hidden>·</span>}
              <span>{part}</span>
            </span>
          ))}
        </footer>
      )}
      {baseMetric && <DefinitionDialog metric={baseMetric} open={showDefinition} onClose={() => setShowDefinition(false)} />}
      {metric && rowsOf && <RowsDialog widget={onlyItem(rowsOf)} name={rowsOf} filters={filters} today={today} onClose={() => setRowsOf(null)} />}
    </article>
  );
}

/** A top list item's figures period by period, oldest first. */
function RowsDialog({ widget, name, filters, today, onClose }: { widget: Widget; name: string; filters: DashboardFilters; today: Date; onClose: () => void }) {
  const metric = metricById(widget.metricId)!;
  const query = widgetQuery({ ...widget, type: "table" }, filters, today);
  const result = query ? runQuery(query) : null;
  return (
    <Dialog open onClose={onClose} title={name} subtitle={`${metric.name}, period by period`} footer={<button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">Close</button>}>
      {result && !result.empty ? <TableWidget metric={metric} result={result} sort="name" previous={null} maxHeight={360} /> : <p className="text-sm text-slate-600">No data for {name}.</p>}
    </Dialog>
  );
}

/** Each value's previous-period figure; Other is the rest of the total where figures add up. */
export function previousByValue(current: QueryResult, previous: QueryResult, additive: boolean): Map<string, number> {
  const map = new Map(previous.series.map((s) => [s.name, s.total]));
  if (additive && current.series.some((s) => s.other)) {
    const named = current.series.filter((s) => !s.other).reduce((a, s) => a + (map.get(s.name) ?? 0), 0);
    map.set("Other", previous.total - named);
  }
  return map;
}

/** The title; in edit mode a button that turns into a field. Enter or leaving the field saves, Escape cancels. */
function WidgetTitle({ id, title, editing, onRename }: { id: string; title: string; editing: boolean; onRename: (t: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (!editing) return <h3 id={id} className={cn("truncate text-sm font-semibold", title ? "text-slate-800" : "italic text-slate-500")}>{title || "New widget"}</h3>;
  if (draft !== null) {
    const commit = () => { if (draft.trim()) onRename(draft.trim()); setDraft(null); };
    return (
      <input
        id={id}
        autoFocus
        aria-label="Widget title"
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDraft(null); }
        }}
        className="min-w-0 flex-1 rounded-md border border-zeno-teal px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
      />
    );
  }
  return (
    <h3 id={id} className="min-w-0">
      <button
        type="button"
        onClick={() => setDraft(title)}
        title="Rename widget"
        className="group flex max-w-full items-center gap-1 rounded text-left text-sm font-semibold text-slate-800 hover:text-zeno-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <span className="truncate">{title || "Untitled widget"}</span>
        <Pencil className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-zeno-teal" aria-hidden />
        <span className="sr-only">, rename</span>
      </button>
    </h3>
  );
}

function State({
  icon: Icon, title, detail, action, tone,
}: {
  icon: typeof AlertCircle; title: string; detail: string; tone?: "error";
  action?: { label: string; icon: typeof RotateCw; onClick: () => void };
}) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 py-4 text-center">
      <Icon className={cn("h-5 w-5", tone === "error" ? "text-red-600" : "text-slate-400")} aria-hidden />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{detail}</p>
      {action && (
      <button
        type="button"
        onClick={action.onClick}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <action.icon className="h-3.5 w-3.5" /> {action.label}
      </button>
      )}
    </div>
  );
}

function Skeleton({ type, height }: { type: Widget["type"]; height: number }) {
  return (
    <div className="animate-pulse" aria-label="Loading">
      {type === "kpi" ? (
        <div className="space-y-2 py-2"><div className="h-7 w-28 rounded bg-slate-100" /><div className="h-3 w-40 rounded bg-slate-100" /></div>
      ) : (
        <div className="rounded-lg bg-slate-100" style={{ height }} />
      )}
    </div>
  );
}

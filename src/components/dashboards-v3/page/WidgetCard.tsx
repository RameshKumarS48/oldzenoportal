"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, BookOpen, Copy, Download, FilterX, Maximize2, Pencil, RotateCw, Trash2 } from "lucide-react";
import { metricById, PROPERTIES } from "@/lib/dashboards-v3/catalogue";
import { GROUPING_LABEL, previousPeriod, rangeLabel } from "@/lib/dashboards-v3/dates";
import { showsUnitTag, UNIT_LABEL } from "@/lib/dashboards-v3/format";
import { allowedSizes, SIZE_LABEL } from "@/lib/dashboards-v3/rules";
import { runQuery, type QueryResult } from "@/lib/dashboards-v3/series";
import type { DashboardFilters, Widget, WidgetSize } from "@/lib/dashboards-v3/types";
import { SPAN, SPAN_COMPACT, widgetQuery } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { toCsv, widgetTable } from "@/lib/dashboards-v3/export";
import { toast } from "@/store/toast";
import { DefinitionDialog } from "./DefinitionDialog";
import { DefinitionTip, FocusTip } from "../ui/FocusTip";
import { RowMenu, type MenuItem } from "../ui/RowMenu";
import { BarWidget } from "../widgets/BarWidget";
import { KpiWidget } from "../widgets/KpiWidget";
import { LineWidget } from "../widgets/LineWidget";
import { StackedBarWidget } from "../widgets/StackedBarWidget";
import { TableWidget } from "../widgets/TableWidget";

const GRID_CHART_PX = 220;
/** The panel's preview stays short so it can sit at the top while the options scroll. */
const PREVIEW_CHART_PX = 140;
/** How long the sandbox pretends a widget takes to load, so the loading state can be seen. */
const LOAD_MS = 450;

export interface WidgetCardProps {
  widget: Widget;
  filters: DashboardFilters;
  today: Date;
  /** Edit mode: rename on click; move, resize, duplicate and remove from ⋯. */
  editing: boolean;
  /** Your own dashboard: ⋯ offers Edit. */
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
  /** "preview" is the panel's live preview: no menu, no loading pause, its container's width. */
  variant?: "grid" | "preview";
  /** placeholder: a new widget not added yet; editing: open in the panel; added: just added, briefly. */
  mark?: "placeholder" | "editing" | "added";
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
  const { widget, filters, today, editing, canChange, failed } = props;
  const metric = metricById(widget.metricId);
  const query = useMemo(() => widgetQuery(widget, filters, today), [widget, filters, today]);

  // A new query "loads" briefly; the signature is everything that changes the numbers.
  const signature = JSON.stringify([widget.metricId, widget.type, widget.range, widget.filter, widget.splitBy, widget.grouping, widget.compare, filters, failed]);
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setLoaded(signature), LOAD_MS);
    return () => clearTimeout(id);
  }, [signature]);
  const loading = props.variant !== "preview" && loaded !== signature;

  const result = useMemo(() => (query ? runQuery(query) : null), [query]);
  const previous = useMemo(() => {
    if (!query || !widget.compare) return null;
    // Every value, not just the top ones: a value can be in this period's top 8 but not the last one's.
    return runQuery({ ...query, range: previousPeriod(query.range), top: Infinity });
  }, [query, widget.compare]);

  const CHART_PX = props.variant === "preview" ? PREVIEW_CHART_PX : GRID_CHART_PX;
  const titleId = `widget-${widget.id}-title`;
  const isText = widget.type === "text";
  // The footer only says what's different from the dashboard: its own period, grouping or filter, or a filter that doesn't apply.
  const footerParts = !isText && query
    ? [
        widget.range && rangeLabel(widget.range),
        widget.grouping && widget.type !== "kpi" && widget.type !== "bar" && GROUPING_LABEL[widget.grouping],
        widget.filter && widget.filter.values.length > 0 && `${PROPERTIES[widget.filter.property].name}: ${widget.filter.values.join(", ")}`,
        result && result.ignored.length > 0 && `${result.ignored.map((p) => PROPERTIES[p].name).join(" and ")} filter doesn’t apply to this metric`,
      ].filter((x): x is string => !!x)
    : [];
  const footer = footerParts.length > 0 ? footerParts : null;
  const [showDefinition, setShowDefinition] = useState(false);

  function exportCsv() {
    if (!result || !metric) return;
    // The same columns as this widget's sheet in the dashboard's Excel export.
    const csv = toCsv(widgetTable(widget, result, metric));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${widget.title || "widget"}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV", "Sandbox file with mock data.");
  }

  const definition: MenuItem[] = metric ? [{ label: "View definition", icon: BookOpen, onSelect: () => setShowDefinition(true) }] : [];
  const exportItem: MenuItem[] = !isText ? [{ label: "Export CSV (mock)", icon: Download, onSelect: exportCsv }] : [];
  // View mode never changes the saved dashboard: Edit is the way into changing it.
  const menu: MenuItem[] = editing
    ? [
        { label: "Edit", icon: Pencil, onSelect: props.onEdit },
        { label: "Duplicate", icon: Copy, onSelect: props.onDuplicate },
        { label: "Move up", icon: ArrowUp, onSelect: () => props.onMove(-1), blocked: props.moveUpBlocked },
        { label: "Move down", icon: ArrowDown, onSelect: () => props.onMove(1), blocked: props.moveDownBlocked },
        {
          label: "Size",
          icon: Maximize2,
          choices: allowedSizes(widget.type).map((size) => ({ label: SIZE_LABEL[size], checked: widget.size === size, onSelect: () => props.onResize(size) })),
        },
        ...definition,
        ...exportItem,
        { label: "Remove", icon: Trash2, onSelect: props.onRemove, danger: true },
      ]
    : [...definition, ...exportItem, ...(canChange ? [{ label: "Edit", icon: Pencil, onSelect: props.onEdit }] : [])];

  return (
    <article
      id={`widget-card-${widget.id}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-busy={loading && !isText}
      className={cn(
        // The shared Card's look (ui/card.tsx): light border, subtle shadow, roomier padding.
        "flex min-w-0 scroll-m-6 flex-col rounded-xl border bg-white shadow-sm transition-shadow focus:outline-none",
        props.variant === "preview" ? "border-slate-200" : props.sizeClass ?? (props.compact ? SPAN_COMPACT : SPAN)[widget.size],
        props.variant !== "preview" && (editing ? "border-dashed border-slate-300" : "border-slate-200"),
        props.mark === "placeholder" && "border-2 border-dashed border-zeno-teal",
        props.mark === "editing" && "border-zeno-teal ring-2 ring-zeno-teal/30",
        props.mark === "added" && "ring-2 ring-zeno-teal ring-offset-2"
      )}
    >
      {props.mark && props.mark !== "added" && (
        <p className="px-5 pt-3 text-xs font-medium text-zeno-teal">{props.mark === "placeholder" ? "New widget · preview" : "Editing in the panel"}</p>
      )}
      <header className="flex items-start gap-2 px-5 pb-3 pt-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
          <WidgetTitle id={titleId} title={widget.title} editing={editing && !props.mark && props.variant !== "preview"} onRename={props.onRename} />
          {metric && <FocusTip label={`What ${metric.name} means`} content={<DefinitionTip {...metric} />} />}
          {metric && !isText && showsUnitTag(metric) && (
            <span className="rounded border border-slate-200 px-1.5 text-[11px] leading-4 text-slate-600">{UNIT_LABEL[metric.unit]}</span>
          )}
        </div>
        {menu.length > 0 && !props.mark && props.variant !== "preview" && <RowMenu label={`Actions for ${widget.title || "widget"}`} items={menu} className="-mr-1.5 -mt-1 shrink-0" />}
      </header>

      {/* A flex column, so line and stacked charts can grow into a card stretched by a taller neighbour. */}
      <div className={cn("flex min-w-0 flex-1 flex-col px-5", isText || !footer ? "pb-5" : "pb-3")}>
        {isText ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{widget.text || <span className="italic text-slate-500">No text yet</span>}</p>
        ) : failed ? (
          <State icon={AlertCircle} tone="error" title="Couldn’t load this widget" detail="The data didn’t arrive. Try again in a moment." action={{ label: "Retry", icon: RotateCw, onClick: props.onRetry }} />
        ) : !metric ? (
          <p className="flex min-h-[96px] items-center justify-center text-sm text-slate-500">Pick a metric to preview</p>
        ) : loading || !query || !result ? (
          <Skeleton type={widget.type} height={CHART_PX} />
        ) : result.empty ? (
          <State icon={FilterX} title="No data for this filter" detail="Nothing matches the dashboard’s filters for this metric." action={{ label: "Reset filters", icon: RotateCw, onClick: props.onResetFilters }} />
        ) : widget.type === "kpi" ? (
          <KpiWidget metric={metric} result={result} previous={previous?.total ?? null} range={query.range} compare={widget.compare} />
        ) : widget.type === "line" ? (
          <LineWidget
            metric={metric}
            result={result}
            previous={previous && !query.splitBy ? previous.series[0].values : null}
            splitBy={query.splitBy}
            goal={widget.goal}
            showValues={widget.showValues}
            minHeight={CHART_PX}
            fill={props.variant !== "preview"}
          />
        ) : widget.type === "bar" ? (
          <div className={cn(props.variant === "preview" && "max-h-[200px] overflow-y-auto")}>
            <BarWidget metric={metric} series={result.series} sort={widget.sort} goal={widget.goal} splitBy={query.splitBy} />
          </div>
        ) : widget.type === "stacked" ? (
          <StackedBarWidget metric={metric} result={result} splitBy={query.splitBy} goal={widget.goal} showValues={widget.showValues} minHeight={CHART_PX + 24} fill={props.variant !== "preview"} />
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
      {metric && <DefinitionDialog metric={metric} open={showDefinition} onClose={() => setShowDefinition(false)} />}
    </article>
  );
}

/** Each value's previous-period figure; Other is the rest of the total where figures add up. */
function previousByValue(current: QueryResult, previous: QueryResult, additive: boolean): Map<string, number> {
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
  action: { label: string; icon: typeof RotateCw; onClick: () => void };
}) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 py-4 text-center">
      <Icon className={cn("h-5 w-5", tone === "error" ? "text-red-600" : "text-slate-400")} aria-hidden />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{detail}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      >
        <action.icon className="h-3.5 w-3.5" /> {action.label}
      </button>
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

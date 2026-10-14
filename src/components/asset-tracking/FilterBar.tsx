"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Columns3, Download, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { SearchInput } from "@/components/ui/FilterControls";
import { Button } from "@/components/ui/button";
import { FILTERS, isActive, valueLabel, type FilterId } from "./filter-defs";
import { FiltersPopover } from "./FiltersPopover";
import { ColumnPicker } from "./ColumnPicker";
import type { DismissReason } from "./ToolbarPopover";
import { DEFAULT_COLUMNS, type ColumnId } from "./vehicle-columns";

/** The tinted selected style used elsewhere (selected rows, tags), with its dark-mode pair. */
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
/**
 * Toolbar buttons: the Swap Audit drawer's outline look (white, bordered, hover
 * slate-50) at the default Button size, which with its border is 38px, the
 * search box's height. The border is slate-300, the outline Button's, a step
 * firmer than StepBtn's slate-200 so the buttons stand out on the slate-50 page.
 */
const TOOL = "shrink-0 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50";
/** Count badge on Filters and Columns, in the sidebar's dark navy. */
const BADGE = "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-zeno-teal text-white text-[10px] font-semibold tabular-nums";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";
/** Text actions (Clear filters): the app's link style, teal, so they don't read as disabled. */
const CLEAR = cn("inline-flex items-center gap-1 text-xs font-medium text-zeno-teal hover:underline dark:text-(--sidebar-text) rounded", RING);
/** Row 2 holds at most this many lines; the rest go behind "+N more". */
const MAX_LINES = 2;
const GAP = 8; // gap-2

type Panel = { kind: "filters"; focusId: FilterId | null } | { kind: "columns" } | null;

/**
 * Asset Tracking's toolbar. Row 1: search, Columns (List view), Filters, Export.
 * Row 2, only while something is active: a chip per filter in FILTERS order,
 * "+N more" past two lines, and Clear filters. Chips open the Filters popover
 * at their filter; their × and Clear filters apply at once. Both popovers wait
 * for Apply, and only one is open at a time: opening one unmounts the other,
 * which discards its draft.
 */
export function FilterBar({
  onExport,
  columns,
}: {
  onExport: () => void;
  /** The list's column selection; omitted in Map view, which hides the Columns button. */
  columns?: { visible: ColumnId[]; onChange: (cols: ColumnId[]) => void };
}) {
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const resetFilters = useAssetTrackingStore((s) => s.resetFilters);

  const [panel, setPanel] = useState<Panel>(null);
  const [visibleCount, setVisibleCount] = useState(Infinity);

  const filterBtn = useRef<HTMLButtonElement>(null);
  const columnsBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const active = FILTERS.filter((f) => isActive(filters, f.id));
  const shown = active.slice(0, Math.min(visibleCount, active.length));
  const hiddenCount = active.length - shown.length;
  const hasRow = active.length > 0;
  const customColumns =
    !!columns &&
    !(columns.visible.length === DEFAULT_COLUMNS.length && DEFAULT_COLUMNS.every((c) => columns.visible.includes(c)));

  // Fit row 2 into MAX_LINES. An invisible copy of every chip gives their
  // widths; packing them as flex-wrap would says how many fit alongside the
  // "+N more" chip and Clear filters.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const compute = () => {
      const width = row.clientWidth;
      const widths = Array.from(measure.children).map((c) => (c as HTMLElement).offsetWidth);
      const clearW = widths.pop()!;
      const moreW = widths.pop()!;
      const fits = (items: number[]) => {
        let lines = 1;
        let x = 0;
        for (const w of items) {
          if (x === 0) x = w;
          else if (x + GAP + w <= width) x += GAP + w;
          else {
            lines++;
            x = w;
          }
        }
        return lines <= MAX_LINES;
      };
      let k = widths.length;
      while (k > 0 && !fits([...widths.slice(0, k), ...(k < widths.length ? [moreW] : []), clearW])) k--;
      setVisibleCount(k);
    };
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [hasRow]);

  function openFilters(focusId: FilterId | null, from: HTMLElement) {
    opener.current = from;
    setPanel({ kind: "filters", focusId });
  }

  function openColumns(from: HTMLElement) {
    opener.current = from;
    setPanel({ kind: "columns" });
  }

  // Focus goes back to whatever opened the popover, or the Filters button if
  // that chip has gone. An outside click leaves focus where it landed, unless
  // that was nowhere.
  const closePanel = useCallback((reason: DismissReason) => {
    setPanel(null);
    requestAnimationFrame(() => {
      if (reason === "outside" && document.activeElement && document.activeElement !== document.body) return;
      const el = opener.current;
      (el?.isConnected ? el : filterBtn.current)?.focus();
    });
  }, []);

  /** The page's "Clear filters": the store's reset, at once. The popover's own one stays open (FiltersPopover). */
  const clearAll = useCallback(() => {
    resetFilters();
    setPanel(null);
    requestAnimationFrame(() => filterBtn.current?.focus());
  }, [resetFilters]);

  function remove(id: FilterId) {
    if (id === "odo") {
      setFilter("odoFrom", null);
      setFilter("odoTo", null);
    } else {
      setFilter(id, "All");
    }
    requestAnimationFrame(() => filterBtn.current?.focus());
  }

  return (
    <div className="space-y-3 shrink-0">
      {/* Row 1 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <SearchInput
            value={filters.search}
            onChange={(v) => setFilter("search", v)}
            placeholder="Search VIN, customer, phone, plate, IMEI…"
            className="w-full sm:w-96 [&_input]:border-slate-300"
          />
          {columns && (
            <Button
              ref={columnsBtn}
              variant="outline"
              onClick={(e) => (panel?.kind === "columns" ? closePanel("close") : openColumns(e.currentTarget))}
              aria-haspopup="dialog"
              aria-expanded={panel?.kind === "columns"}
              aria-controls={panel?.kind === "columns" ? "asset-columns-popover" : undefined}
              aria-label={customColumns ? `Columns, ${columns.visible.length} visible` : "Columns"}
              className={TOOL}
            >
              <Columns3 className="w-4 h-4" />
              Columns
              {customColumns && <span className={BADGE}>{columns.visible.length}</span>}
            </Button>
          )}
          <Button
            ref={filterBtn}
            variant="outline"
            onClick={(e) => (panel?.kind === "filters" ? closePanel("close") : openFilters(null, e.currentTarget))}
            aria-haspopup="dialog"
            aria-expanded={panel?.kind === "filters"}
            aria-controls={panel?.kind === "filters" ? "asset-filters-popover" : undefined}
            aria-label={active.length > 0 ? `Filters, ${active.length} active` : "Filters"}
            className={cn(TOOL, active.length > 0 && cn(TINT, "border-zeno-teal/30 hover:bg-zeno-teal/15"))}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {active.length > 0 && (
              <span className={BADGE}>{active.length}</span>
            )}
          </Button>
        </div>

        <Button variant="primary" onClick={onExport} className="shrink-0">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Row 2 */}
      {hasRow && (
        <div ref={rowRef} className="relative flex flex-wrap items-center gap-2">
          {shown.map(({ id, label }) => (
            <Chip
              key={id}
              label={label}
              value={valueLabel(filters, id)}
              onOpen={(el) => openFilters(id, el)}
              onRemove={() => remove(id)}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={(e) => openFilters(null, e.currentTarget)}
              aria-haspopup="dialog"
              aria-label={`${hiddenCount} more filters. Open filters`}
              className={cn(
                "px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-colors",
                RING
              )}
            >
              +{hiddenCount} more
            </button>
          )}
          <button onClick={clearAll} className={CLEAR}>
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>

          {/* Invisible copies, for measuring only: every chip, then "+N more", then Clear filters. */}
          <div ref={measureRef} aria-hidden inert className="absolute left-0 top-0 invisible flex w-max items-center gap-2 pointer-events-none">
            {active.map(({ id, label }) => (
              <Chip key={id} label={label} value={valueLabel(filters, id)} onOpen={() => {}} onRemove={() => {}} />
            ))}
            <span className="px-3 py-1 rounded-full border border-slate-200 text-xs font-medium">+{active.length} more</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <X className="w-3.5 h-3.5" />
              Clear filters
            </span>
          </div>
        </div>
      )}

      {panel?.kind === "filters" && (
        <FiltersPopover
          key={panel.focusId ?? "all"}
          anchorRef={filterBtn}
          focusId={panel.focusId}
          onDismiss={closePanel}
          onClearAll={resetFilters}
        />
      )}
      {panel?.kind === "columns" && columns && (
        <ColumnPicker anchorRef={columnsBtn} visible={columns.visible} onChange={columns.onChange} onDismiss={closePanel} />
      )}
    </div>
  );
}

/** "Field: value", which opens the drawer at that filter, and × to remove it. */
function Chip({
  label,
  value,
  onOpen,
  onRemove,
}: {
  label: string;
  value: string;
  onOpen: (el: HTMLElement) => void;
  onRemove: () => void;
}) {
  const text = `${label}: ${value}`;
  return (
    <span className={cn("inline-flex max-w-full shrink-0 items-center rounded-full text-xs font-medium", TINT)}>
      <button
        onClick={(e) => onOpen(e.currentTarget)}
        title={text}
        aria-haspopup="dialog"
        aria-label={`${text}. Edit in filters`}
        className={cn("inline-flex min-w-0 items-center gap-1 pl-3 pr-1.5 py-1 rounded-l-full", RING)}
      >
        <span className="shrink-0">{label}:</span>
        <span className="truncate max-w-40">{value}</span>
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className={cn("mr-1 p-0.5 rounded-full hover:bg-zeno-teal/15", RING)}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

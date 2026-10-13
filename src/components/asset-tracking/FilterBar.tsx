"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Download, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetTrackingStore } from "@/store/asset-tracking";
import { SearchInput } from "@/components/ui/FilterControls";
import { Button } from "@/components/ui/button";
import { FILTERS, isActive, valueLabel, type FilterId } from "./filter-defs";
import { FiltersSheet } from "./FiltersSheet";

/** The tinted selected style used elsewhere (selected rows, tags), with its dark-mode pair. */
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";
const CLEAR = cn("inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors rounded", RING);
/** Row 2 holds at most this many lines; the rest go behind "+N more". */
const MAX_LINES = 2;
const GAP = 8; // gap-2

/**
 * Asset Tracking's filters. Row 1: search, the Filters button, Export. Row 2,
 * only while something is active: a chip per filter in FILTERS order, "+N more"
 * past two lines, and Clear filters. Chips open the drawer at their filter;
 * their × and Clear filters apply at once. The drawer waits for Apply.
 */
export function FilterBar({ onExport }: { onExport: () => void }) {
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const resetFilters = useAssetTrackingStore((s) => s.resetFilters);

  const [sheet, setSheet] = useState<{ open: boolean; focusId: FilterId | null }>({ open: false, focusId: null });
  const [visibleCount, setVisibleCount] = useState(Infinity);

  const filterBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const active = FILTERS.filter((f) => isActive(filters, f.id));
  const shown = active.slice(0, Math.min(visibleCount, active.length));
  const hiddenCount = active.length - shown.length;
  const hasRow = active.length > 0;

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

  function openSheet(focusId: FilterId | null, from: HTMLElement) {
    opener.current = from;
    setSheet({ open: true, focusId });
  }

  // Focus goes back to whatever opened the drawer, or the Filters button if that chip has gone.
  const closeSheet = useCallback(() => {
    setSheet((s) => ({ ...s, open: false }));
    requestAnimationFrame(() => {
      const el = opener.current;
      (el?.isConnected ? el : filterBtn.current)?.focus();
    });
  }, []);

  /** The one "Clear filters", on the page and in the drawer: the store's reset, at once. */
  const clearAll = useCallback(() => {
    resetFilters();
    setSheet((s) => ({ ...s, open: false }));
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
            className="w-full sm:w-96"
          />
          <Button
            ref={filterBtn}
            variant="secondary"
            onClick={(e) => openSheet(null, e.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={sheet.open}
            aria-label={active.length > 0 ? `Filters, ${active.length} active` : "Filters"}
            className={cn("shrink-0", active.length > 0 && cn(TINT, "hover:bg-zeno-teal/15"))}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {active.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-zeno-red text-white text-[10px] font-semibold tabular-nums">
                {active.length}
              </span>
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
              onOpen={(el) => openSheet(id, el)}
              onRemove={() => remove(id)}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={(e) => openSheet(null, e.currentTarget)}
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

      <FiltersSheet open={sheet.open} focusId={sheet.focusId} onClose={closeSheet} onClearAll={clearAll} />
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

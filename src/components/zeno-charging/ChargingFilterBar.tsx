"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Columns3, Download, FileSpreadsheet, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/ui/FilterControls";
import { ClearFiltersButton } from "@/components/ui/ClearFiltersButton";
import { CAPTION, ToolbarPopover, type DismissReason } from "@/components/asset-tracking/ToolbarPopover";
import { ACCESS_TYPES, ASSET_TYPES, COUNTRIES, ELECTRICITY_SERVICE_TYPES, PHASE_TYPES, ZONES } from "@/lib/charging/fields";
import {
  CHARGING_FILTERS, IN_APP_LABELS, NO_FILTERS, STATUS_LABELS, filterValueLabel, isFilterActive,
  type ChargingFilters, type FilterId,
} from "./list";
import { CHARGING_COLUMNS, DEFAULT_CHARGING_COLUMNS, type ChargingColumnId } from "./columns";

// Vehicle Tracking's toolbar styles (asset-tracking/FilterBar.tsx).
const TINT = "bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)";
const BAR = "bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap";
const SEARCH = "pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#003B49]/20 focus:border-[#003B49] w-72";
const TOOL = "shrink-0 inline-flex items-center gap-1.5 text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#003B49]/20";
const BADGE = "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-zeno-teal text-white text-[10px] font-semibold tabular-nums";
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

type Panel = { kind: "filters"; focusId: FilterId | null } | { kind: "columns" } | null;

/**
 * Zeno Charging Network's toolbar, as Vehicle Tracking's. Row 1: search,
 * Columns, Filters, Export (Excel, or the Google Business Profile CSV). Row 2, while any filter is on: a chip per
 * filter (opens Filters at it; × removes it) and Clear filters. Both popovers
 * apply on Apply; Cancel, Esc or a click outside discards.
 */
export function ChargingFilterBar({
  search, onSearch, filters, onFilters, towns, columns, onColumns, shown, total, onExport, onExportGoogle, action, showColumns = true,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: ChargingFilters;
  onFilters: (f: ChargingFilters) => void;
  towns: string[];
  columns: ChargingColumnId[];
  onColumns: (c: ChargingColumnId[]) => void;
  shown: number;
  total: number;
  onExport: () => void;
  onExportGoogle: () => void;
  /** The page's main action (Add charging asset), shown just left of Export. */
  action?: React.ReactNode;
  /** Columns only applies to List View; Map View hides it, as Vehicle Tracking does. */
  showColumns?: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const filterBtn = useRef<HTMLButtonElement>(null);
  const columnsBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const active = CHARGING_FILTERS.filter((f) => isFilterActive(filters, f.id));
  const customColumns = !(columns.length === DEFAULT_CHARGING_COLUMNS.length && DEFAULT_CHARGING_COLUMNS.every((c) => columns.includes(c)));
  const narrowed = active.length > 0 || search.trim() !== "";

  const closePanel = useCallback((reason: DismissReason) => {
    setPanel(null);
    requestAnimationFrame(() => {
      if (reason === "outside" && document.activeElement && document.activeElement !== document.body) return;
      const el = opener.current;
      (el?.isConnected ? el : filterBtn.current)?.focus();
    });
  }, []);

  const open = (p: Panel, from: HTMLElement) => { opener.current = from; setPanel(p); };
  const remove = (id: FilterId) => onFilters({ ...filters, [id]: NO_FILTERS[id] });

  return (
    <div className="space-y-3 shrink-0">
      <div className={BAR}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search ID, name, site, landmark, partner…" aria-label="Search charging assets" className={SEARCH} />
        </div>
        {showColumns && <button
          ref={columnsBtn}
          onClick={(e) => (panel?.kind === "columns" ? closePanel("close") : open({ kind: "columns" }, e.currentTarget))}
          aria-haspopup="dialog"
          aria-expanded={panel?.kind === "columns"}
          className={TOOL}
        >
          <Columns3 className="h-3.5 w-3.5" /> Columns
          {customColumns && <span className={cn(BADGE, "-my-0.5")}>{columns.length}</span>}
        </button>}
        <button
          ref={filterBtn}
          onClick={(e) => (panel?.kind === "filters" ? closePanel("close") : open({ kind: "filters", focusId: null }, e.currentTarget))}
          aria-haspopup="dialog"
          aria-expanded={panel?.kind === "filters"}
          className={cn(TOOL, active.length > 0 && cn(TINT, "border-zeno-teal/30 hover:bg-zeno-teal/15"))}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {active.length > 0 && <span className={cn(BADGE, "-my-0.5")}>{active.length}</span>}
        </button>
        <span aria-live="polite" className="ml-auto text-xs tabular-nums text-slate-500">
          {narrowed ? `${shown.toLocaleString()} of ${total.toLocaleString()} assets` : `${total.toLocaleString()} assets`}
        </span>
        {action}
        <ExportMenu onExcel={onExport} onGoogle={onExportGoogle} />
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map(({ id, label }) => {
            const text = `${label}: ${filterValueLabel(filters, id)}`;
            return (
              <span key={id} className={cn("inline-flex max-w-full shrink-0 items-center rounded-full text-xs font-medium", TINT)}>
                <button onClick={(e) => open({ kind: "filters", focusId: id }, e.currentTarget)} title={text} aria-label={`${text}. Edit in filters`} className={cn("inline-flex min-w-0 items-center gap-1 rounded-l-full py-1 pl-3 pr-1.5", RING)}>
                  <span className="shrink-0">{label}:</span>
                  <span className="max-w-40 truncate">{filterValueLabel(filters, id)}</span>
                </button>
                <button onClick={() => remove(id)} aria-label={`Remove ${label} filter`} className={cn("mr-1 rounded-full p-0.5 hover:bg-zeno-teal/15", RING)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <ClearFiltersButton onClick={() => onFilters(NO_FILTERS)} />
        </div>
      )}

      {panel?.kind === "filters" && (
        <FiltersPopover key={panel.focusId ?? "all"} anchorRef={filterBtn} focusId={panel.focusId} filters={filters} towns={towns} onApply={onFilters} onDismiss={closePanel} />
      )}
      {panel?.kind === "columns" && (
        <ColumnsPopover anchorRef={columnsBtn} visible={columns} onChange={onColumns} onDismiss={closePanel} />
      )}
    </div>
  );
}

// "All" in the dropdowns is "" in the filters.
const ALL = "All";
const toUi = (v: string) => (v === "" ? ALL : v);
const fromUi = (v: string) => (v === ALL ? "" : v);
const labelKey = <K extends string>(labels: Record<K, string>, label: string) => (Object.keys(labels) as K[]).find((k) => labels[k] === label) ?? ("" as K);

function FiltersPopover({ anchorRef, focusId, filters, towns, onApply, onDismiss }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  focusId: FilterId | null;
  filters: ChargingFilters;
  towns: string[];
  onApply: (f: ChargingFilters) => void;
  onDismiss: (reason: DismissReason) => void;
}) {
  const [draft, setDraft] = useState<ChargingFilters>(filters);
  const set = <K extends keyof ChargingFilters>(k: K, v: ChargingFilters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const changed = JSON.stringify(draft) !== JSON.stringify(filters);
  const draftActive = CHARGING_FILTERS.filter((f) => isFilterActive(draft, f.id)).length;

  const select = (id: Exclude<FilterId, "status" | "inApp" | "attention">, label: string, options: readonly string[], span: string) => (
    <div data-filter={id} className={span}>
      <SelectField label={label} value={toUi(draft[id])} options={[ALL, ...options]} onChange={(v) => set(id, fromUi(v))} />
    </div>
  );

  return (
    <ToolbarPopover
      id="charging-filters-popover"
      title="Filters"
      anchorRef={anchorRef}
      width="w-[560px] max-w-[calc(100vw-1rem)]"
      initialFocus={focusId ? `[data-filter="${focusId}"] :is(select, input)` : undefined}
      onDismiss={onDismiss}
      footerAction={{ label: "Clear filters", icon: <X className="h-3.5 w-3.5" />, onClick: () => { onApply(NO_FILTERS); setDraft(NO_FILTERS); } }}
      applyLabel={changed && draftActive > 0 ? `Apply · ${draftActive}` : "Apply"}
      applyDisabled={!changed}
      onApply={() => { onApply(draft); onDismiss("close"); }}
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className={CAPTION}>Asset</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("type", "Type", ASSET_TYPES, "col-span-3")}
            <div data-filter="status" className="col-span-3">
              <SelectField label="Status" value={STATUS_LABELS[draft.status]} options={Object.values(STATUS_LABELS)} onChange={(v) => set("status", labelKey(STATUS_LABELS, v))} />
            </div>
            {select("access", "Access", ACCESS_TYPES, "col-span-3")}
            <div data-filter="inApp" className="col-span-3">
              <SelectField label="In the app & website" value={IN_APP_LABELS[draft.inApp]} options={Object.values(IN_APP_LABELS)} onChange={(v) => set("inApp", labelKey(IN_APP_LABELS, v))} />
            </div>
          </div>
        </section>
        <section className="space-y-2">
          <h3 className={CAPTION}>Location</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("country", "Country", COUNTRIES, "col-span-2")}
            {select("town", "Town", towns, "col-span-2")}
            {select("zone", "Zone", ZONES, "col-span-2")}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className={CAPTION}>Electricity</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("phase", "Phase", PHASE_TYPES, "col-span-3")}
            {select("electricity", "Electricity service", ELECTRICITY_SERVICE_TYPES, "col-span-3")}
          </div>
        </section>
        <section className="space-y-2" data-filter="attention">
          <h3 className={CAPTION}>Data quality</h3>
          <Checkbox label="Only assets that need attention (missing or invalid details from the sheet)" checked={draft.attention} onChange={(on) => set("attention", on)} className="items-center gap-2 text-sm" />
        </section>
      </div>
    </ToolbarPopover>
  );
}

const same = (a: ChargingColumnId[], b: ChargingColumnId[]) => a.length === b.length && a.every((c) => b.includes(c));

function ColumnsPopover({ anchorRef, visible, onChange, onDismiss }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: ChargingColumnId[];
  onChange: (c: ChargingColumnId[]) => void;
  onDismiss: (reason: DismissReason) => void;
}) {
  const [draft, setDraft] = useState<ChargingColumnId[]>(visible);
  const toggle = (id: ChargingColumnId, on: boolean) => setDraft((d) => CHARGING_COLUMNS.filter((c) => (c.id === id ? on : d.includes(c.id))).map((c) => c.id));
  return (
    <ToolbarPopover
      id="charging-columns-popover"
      title="Columns"
      anchorRef={anchorRef}
      width="w-70"
      initialFocus='[role="checkbox"]:not([disabled])'
      onDismiss={onDismiss}
      footerAction={{ label: "Reset to default", onClick: () => { onChange(DEFAULT_CHARGING_COLUMNS); setDraft(DEFAULT_CHARGING_COLUMNS); } }}
      applyLabel="Apply"
      applyDisabled={same(draft, visible)}
      onApply={() => { onChange(draft); onDismiss("close"); }}
    >
      <div className="space-y-2">
        {CHARGING_COLUMNS.map(({ id, label }) => (
          <Checkbox key={id} label={label} checked={draft.includes(id)} disabled={id === "assetId"} onChange={(on) => toggle(id, on)} className="items-center gap-2 text-sm" />
        ))}
      </div>
    </ToolbarPopover>
  );
}

/** One Export button; its menu picks the file. Both export the rows the search and filters leave. */
function ExportMenu({ onExcel, onGoogle }: { onExcel: () => void; onGoogle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const item = "flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none";
  const pick = (fn: () => void) => { setOpen(false); fn(); };
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg bg-[#003B49] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#00505f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003B49]/40 focus-visible:ring-offset-1"
      >
        <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <button role="menuitem" type="button" className={item} onClick={() => pick(onExcel)}>
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span><span className="block text-sm font-medium text-slate-800">Excel (XLSX)</span><span className="text-xs text-slate-500">Every field, in the sheet’s column layout</span></span>
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => pick(onGoogle)}>
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span><span className="block text-sm font-medium text-slate-800">Google Business Profile (CSV)</span><span className="text-xs text-slate-500">Published locations, for the bulk upload</span></span>
          </button>
        </div>
      )}
    </div>
  );
}

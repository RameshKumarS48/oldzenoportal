"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetTrackingStore, type FilterState } from "@/store/asset-tracking";
import { Field, SelectField } from "@/components/ui/FilterControls";
import { Button } from "@/components/ui/button";
import { FILTERS, isActive, isoToLabel, labelToIso, optionsFor, type FilterId, type SelectKey } from "./filter-defs";

const SELECT_KEYS: SelectKey[] = ["status", "connectivity", "immobilization", "tenant", "storeCode", "vcu", "zeConnect", "evcc"];
const FIRMWARE: FilterId[] = ["vcu", "zeConnect", "evcc"];

/** The drawer's own copy of the filters. The date is ISO for the date field; Odo ends are field text. */
type Draft = Record<SelectKey, string> & { date: string; odoFrom: string; odoTo: string };

/** Same field style as FilterControls' shared CONTROL, which isn't exported. */
const CONTROL =
  "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 transition-colors";

/** Group headings, in the caption style ColumnFilterPanel uses. */
const CAPTION = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function draftFrom(f: FilterState): Draft {
  return {
    status: f.status, connectivity: f.connectivity, immobilization: f.immobilization, tenant: f.tenant,
    storeCode: f.storeCode, vcu: f.vcu, zeConnect: f.zeConnect, evcc: f.evcc,
    date: f.dateOfSale === "All" ? "" : labelToIso(f.dateOfSale),
    odoFrom: f.odoFrom !== null ? String(f.odoFrom) : "",
    odoTo: f.odoTo !== null ? String(f.odoTo) : "",
  };
}

/** What Apply would write to the store. */
function targetOf(d: Draft): Omit<FilterState, "search"> {
  return {
    ...(Object.fromEntries(SELECT_KEYS.map((k) => [k, d[k]])) as Record<SelectKey, string>),
    dateOfSale: d.date ? isoToLabel(d.date) : "All",
    odoFrom: d.odoFrom.trim() === "" ? null : Number(d.odoFrom),
    odoTo: d.odoTo.trim() === "" ? null : Number(d.odoTo),
  };
}

/**
 * Every filter except search, in a drawer over the page. The drawer covers the
 * table, so edits go to a draft copied from the store on open, and only Apply
 * writes them, through the store's own setters. Cancel, ✕, Esc and the
 * backdrop discard the draft. "Clear filters" isn't a draft action: it clears
 * everything at once, like the page's own Clear filters.
 *
 * Styled after Swap Audit's SessionDrawer, and rendered in place for the same
 * reason: it has to stay inside <main> to pick up globals.css's dark-mode overrides.
 */
export function FiltersSheet({
  open,
  focusId,
  onClose,
  onClearAll,
}: {
  open: boolean;
  /** The filter whose control takes focus on open (from a chip); the title otherwise. */
  focusId: FilterId | null;
  onClose: () => void;
  onClearAll: () => void;
}) {
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const vehicles = useAssetTrackingStore((s) => s.vehicles);

  const [draft, setDraft] = useState<Draft>(() => draftFrom(filters));
  const [firmwareOpen, setFirmwareOpen] = useState(false);
  // Each time it opens, start again from the filters as they are now. Firmware
  // starts collapsed unless it holds an active filter or the one being focused.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(draftFrom(filters));
      setFirmwareOpen(FIRMWARE.some((id) => isActive(filters, id)) || (focusId !== null && FIRMWARE.includes(focusId)));
    }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const target = targetOf(draft);
  const changed = (Object.keys(target) as (keyof typeof target)[]).filter((k) => target[k] !== filters[k]);
  const draftActive = FILTERS.filter(({ id }) => isActive({ ...target, search: "" }, id)).length;

  function apply() {
    for (const key of changed) setFilter(key, target[key]);
    onClose();
  }

  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Focus lands on the chosen filter's control, or on the title so screen readers announce the drawer.
  useEffect(() => {
    if (!open) return;
    const control = focusId
      ? panelRef.current?.querySelector<HTMLElement>(`[data-filter="${focusId}"] :is(select, input)`)
      : null;
    (control ?? titleRef.current)?.focus();
  }, [open, focusId]);

  // Esc is Cancel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // A wheel over the backdrop must not scroll the table behind it. React's
  // onWheel is passive, so this needs a real listener to preventDefault.
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, []);

  // Keep Tab inside the drawer while it's open.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === titleRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const select = (id: SelectKey, label: string) => (
    <div data-filter={id}>
      <SelectField label={label} value={draft[id]} options={optionsFor(id, vehicles)} onChange={(v) => set(id, v)} />
    </div>
  );

  return (
    <div
      inert={!open}
      className={cn(
        "fixed inset-0 z-50 flex justify-end transition-opacity",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-sheet-title"
        onKeyDown={trapTab}
        className={cn(
          "relative bg-white w-full sm:w-md h-full shadow-2xl flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
          <h2
            id="filters-sheet-title"
            ref={titleRef}
            tabIndex={-1}
            className="font-medium text-slate-700 focus:outline-none"
          >
            Filters
          </h2>
          <button onClick={onClose} aria-label="Close filters" className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">
          <section className="space-y-3">
            <h3 className={CAPTION}>Vehicle</h3>
            <div className="grid grid-cols-2 gap-3">
              {select("status", "Status")}
              {select("connectivity", "Connectivity")}
              {select("immobilization", "Immobilization")}
              {select("tenant", "Tenant")}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={CAPTION}>Ownership</h3>
            <div className="grid grid-cols-2 gap-3">{select("storeCode", "Store Code")}</div>
          </section>

          <section className="space-y-3">
            <h3 className={CAPTION}>Usage</h3>
            <div data-filter="dateOfSale">
              <Field label="Date of Sale">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Date of Sale"
                    value={draft.date}
                    onChange={(e) => set("date", e.target.value)}
                    className={CONTROL}
                  />
                  <Button
                    variant="outline"
                    onClick={() => set("date", "")}
                    disabled={!draft.date}
                    aria-label="Clear Date of Sale"
                    className="px-2.5 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Field>
            </div>
            <div data-filter="odo" className="grid grid-cols-2 gap-3">
              <Field label="Odo From">
                <input
                  type="number"
                  min={0}
                  aria-label="Odo From"
                  placeholder="0"
                  value={draft.odoFrom}
                  onChange={(e) => set("odoFrom", e.target.value)}
                  className={CONTROL}
                />
              </Field>
              <Field label="Odo To">
                <input
                  type="number"
                  min={0}
                  aria-label="Odo To"
                  placeholder="∞"
                  value={draft.odoTo}
                  onChange={(e) => set("odoTo", e.target.value)}
                  className={CONTROL}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={CAPTION}>
              <button
                onClick={() => setFirmwareOpen((v) => !v)}
                aria-expanded={firmwareOpen}
                aria-controls="filters-firmware"
                className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
              >
                Firmware
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", firmwareOpen ? "rotate-0" : "-rotate-90")} />
              </button>
            </h3>
            {firmwareOpen && (
              <div id="filters-firmware" className="grid grid-cols-2 gap-3">
                {select("vcu", "VCU")}
                {select("zeConnect", "ZeConnect")}
                {select("evcc", "EVCC")}
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 bg-white">
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="teal" onClick={apply} disabled={changed.length === 0}>
              {changed.length > 0 && draftActive > 0 ? `Apply · ${draftActive}` : "Apply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

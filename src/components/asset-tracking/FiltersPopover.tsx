"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAssetTrackingStore, type FilterState } from "@/store/asset-tracking";
import { Field, SelectField } from "@/components/ui/FilterControls";
import { Button } from "@/components/ui/button";
import { FILTERS, isActive, isoToLabel, labelToIso, optionsFor, type FilterId, type SelectKey } from "./filter-defs";
import { CAPTION, ToolbarPopover, type DismissReason } from "./ToolbarPopover";

const SELECT_KEYS: SelectKey[] = ["status", "connectivity", "immobilization", "tenant", "storeCode", "vcu", "zeConnect", "evcc"];

/** The popover's own copy of the filters. The date is ISO for the date field; Odo ends are field text. */
type Draft = Record<SelectKey, string> & { date: string; odoFrom: string; odoTo: string };

/** Same field style as FilterControls' shared CONTROL, which isn't exported. */
const CONTROL =
  "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 " +
  "focus:outline-none focus:ring-2 focus:ring-zeno-teal/20 focus:border-zeno-teal/40 transition-colors";

function draftFrom(f: FilterState): Draft {
  return {
    status: f.status, connectivity: f.connectivity, immobilization: f.immobilization, tenant: f.tenant,
    storeCode: f.storeCode, vcu: f.vcu, zeConnect: f.zeConnect, evcc: f.evcc,
    date: f.dateOfSale === "All" ? "" : labelToIso(f.dateOfSale),
    odoFrom: f.odoFrom !== null ? String(f.odoFrom) : "",
    odoTo: f.odoTo !== null ? String(f.odoTo) : "",
  };
}

/** Every filter at "All": what the fields show after Clear filters. */
const CLEARED = draftFrom({
  immobilization: "All", dateOfSale: "All", connectivity: "All", odoFrom: null, odoTo: null,
  storeCode: "All", vcu: "All", zeConnect: "All", evcc: "All", status: "All", tenant: "All", search: "",
});

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
 * Every filter except search, in the toolbar popover under the Filters button.
 * Edits go to a draft copied from the store when it opens, and only Apply writes
 * them, through the store's own setters. Cancel, Esc and an outside click
 * discard the draft. "Clear filters" isn't a draft action: it clears everything
 * at once, like the page's own Clear filters, and empties the fields, but
 * leaves the popover open.
 *
 * Groups sit on a six-part grid, so three-filter groups run three across and
 * two-filter groups two across, with no empty cells.
 */
export function FiltersPopover({
  anchorRef,
  focusId,
  onDismiss,
  onClearAll,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  /** The filter whose control takes focus on open (from a chip); the first control otherwise. */
  focusId: FilterId | null;
  onDismiss: (reason: DismissReason) => void;
  /** Clears every applied filter at once (the store's reset). The popover stays open. */
  onClearAll: () => void;
}) {
  const filters = useAssetTrackingStore((s) => s.filters);
  const setFilter = useAssetTrackingStore((s) => s.setFilter);
  const vehicles = useAssetTrackingStore((s) => s.vehicles);

  // Mounted only while open, so the draft starts from the filters as they are now.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(filters));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const target = targetOf(draft);
  const changed = (Object.keys(target) as (keyof typeof target)[]).filter((k) => target[k] !== filters[k]);
  const draftActive = FILTERS.filter(({ id }) => isActive({ ...target, search: "" }, id)).length;

  function apply() {
    for (const key of changed) setFilter(key, target[key]);
    onDismiss("close");
  }

  const select = (id: SelectKey, label: string, span: string) => (
    <div data-filter={id} className={span}>
      <SelectField label={label} value={draft[id]} options={optionsFor(id, vehicles)} onChange={(v) => set(id, v)} />
    </div>
  );

  return (
    <ToolbarPopover
      id="asset-filters-popover"
      title="Filters"
      anchorRef={anchorRef}
      width="w-[560px] max-w-[calc(100vw-1rem)]"
      initialFocus={focusId ? `[data-filter="${focusId}"] :is(select, input)` : undefined}
      onDismiss={onDismiss}
      footerAction={{
        label: "Clear filters",
        icon: <X className="w-3.5 h-3.5" />,
        onClick: () => {
          onClearAll();
          // The fields follow, so the popover shows the cleared state and Apply has nothing to do.
          setDraft(CLEARED);
        },
      }}
      applyLabel={changed.length > 0 && draftActive > 0 ? `Apply · ${draftActive}` : "Apply"}
      applyDisabled={changed.length === 0}
      onApply={apply}
    >
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className={CAPTION}>Vehicle</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("status", "Status", "col-span-2")}
            {select("connectivity", "Connectivity", "col-span-2")}
            {select("immobilization", "Immobilization", "col-span-2")}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className={CAPTION}>Ownership</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("tenant", "Tenant", "col-span-3")}
            {select("storeCode", "Store Code", "col-span-3")}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className={CAPTION}>Usage</h3>
          <div className="grid grid-cols-6 gap-3">
            <div data-filter="dateOfSale" className="col-span-3">
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
            <div data-filter="odo" className="col-span-3 grid grid-cols-2 gap-3">
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
          </div>
        </section>

        <section className="space-y-2">
          <h3 className={CAPTION}>Firmware</h3>
          <div className="grid grid-cols-6 gap-3">
            {select("vcu", "VCU", "col-span-2")}
            {select("zeConnect", "ZeConnect", "col-span-2")}
            {select("evcc", "EVCC", "col-span-2")}
          </div>
        </section>
      </div>
    </ToolbarPopover>
  );
}

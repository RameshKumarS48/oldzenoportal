"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChartBar, ChartColumnStacked, ChartLine, Hash, ListOrdered, Table2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { metricById, PROPERTIES, PROPERTY_ORDER, type CategoryId, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { autoGroupingHint, RANGE_PRESETS, rangeLabel, rangeWithDates } from "@/lib/dashboards-v3/dates";
import {
  autoTitle, chartChoiceBlocked, chartForIntent, compareBlocked, groupingBlocked, normalise, percentBlocked, rangeBlocked, recommendedIntent,
  sameWidget, showValuesBlocked, sortBlocked,
} from "@/lib/dashboards-v3/editor";
import { canStack, canSwitch, INTENTS, intentOf, splitBlocked, SWITCH_MAX, topFor, type Intent } from "@/lib/dashboards-v3/rules";
import type { DashboardFilters, Grouping, Widget, WidgetSort } from "@/lib/dashboards-v3/types";
import { widgetQuery } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { InlineConfirm } from "../ui/InlineConfirm";
import { FIELD, FIELD_LABEL, OptionChips, Toggle } from "./controls";
import { MetricPicker } from "./MetricPicker";
import { WidgetFilters } from "./WidgetFilters";

const INTENT_ICON: Record<Intent, typeof Hash> = { number: Hash, time: ChartLine, compare: ChartBar, parts: ChartColumnStacked, top: ListOrdered, list: Table2 };
/** A section heading that stays at the top of the panel's scroll area while its section is in view. */
const STICKY = "sticky top-0 z-10 -mx-5 block bg-white px-5 pb-2 pt-3 text-sm font-semibold text-slate-800";

/** One of the panel's sections, under a sticky heading. */
function Section({ id, title, children, as = "h3" }: { id: string; title: string; children: React.ReactNode; as?: "h3" | "label" }) {
  return (
    <section aria-labelledby={id}>
      {as === "label" ? <label id={id} htmlFor={`${id}-field`} className={STICKY}>{title}</label> : <h3 id={id} className={STICKY}>{title}</h3>}
      {children}
    </section>
  );
}

/**
 * Adding or editing a widget, in edit mode on your own dashboards only,
 * beside the dashboard rather than over it. The widget in the grid (or the
 * dashed placeholder for a new one) is the live preview; nothing reaches
 * the dashboard's draft until Add widget or Save widget, and nothing is
 * saved until the dashboard's Save.
 *
 * One column of sections, each heading staying in view as the options
 * scroll: what to see, the metric, time range, filters, breakdown, display
 * and title. Options that don't apply to the chosen chart are hidden, not
 * greyed.
 */
export function WidgetPanel({
  mode, widget, initial, category, filters, today, onChange, onSubmit, onClose, switchRequest,
}: {
  mode: "add" | "edit";
  widget: Widget;
  /** The widget as the panel opened with it, to tell whether anything changed. */
  initial: Widget;
  category: CategoryId;
  filters: DashboardFilters;
  today: Date;
  onChange: (w: Widget) => void;
  onSubmit: (w: Widget) => void;
  onClose: () => void;
  /** The page asked to open another widget while this one has changes: confirmed here, in the footer. */
  switchRequest?: { onDiscard: () => void; onKeep: () => void } | null;
}) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [titleEdited, setTitleEdited] = useState(mode === "edit" && initial.title !== autoTitle(initial));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lastMetric = useRef(widget.metricId);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const metric = metricById(widget.metricId);
  const isText = widget.type === "text";
  const intent = intentOf(widget.type);
  const recommended = recommendedIntent(widget, filters);
  // Choices that can't show this metric are left out; Compare items, What it's made of and Top list add a breakdown when chosen.
  const intents = INTENTS.filter((i) =>
    i.id === "parts" ? !metric || (canStack(metric) && !chartChoiceBlocked("stacked", widget))
    : i.id === "compare" || i.id === "top" ? !metric || !chartChoiceBlocked(chartForIntent(i.id), widget)
    : true);
  const dirty = !sameWidget(widget, initial);
  const valid = isText ? !!(widget.title.trim() || widget.text?.trim()) : !!metric;
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirming = confirmDiscard || !!switchRequest;
  /** Closing with changes asks in the footer; asked again (Escape, ✕), it means keep editing. */
  const requestClose = () => (confirming ? keepEditing() : dirty ? setConfirmDiscard(true) : onClose());
  function keepEditing() {
    setConfirmDiscard(false);
    switchRequest?.onKeep();
    requestAnimationFrame(() => cancelButton.current?.focus());
  }

  /** Every change goes through here, so the widget stays valid and its title stays automatic until someone types one. */
  function set(patch: Partial<Widget>) {
    let next: Widget = { ...widget, ...patch };
    if (next.type !== "text" && !next.metricId) next.metricId = lastMetric.current;
    if (next.metricId) lastMetric.current = next.metricId;
    // A size chosen from the widget's ⋯ menu is kept while the chart allows it.
    next = normalise(next, mode === "edit");
    if (!titleEdited) next.title = autoTitle(next);
    onChange(next);
  }

  const needsSplit = widget.type === "bar" || widget.type === "stacked" || widget.type === "toplist";
  const splitOptions = metric ? PROPERTY_ORDER.filter((p) => !splitBlocked(widget.type, metric, p)) : [];
  const id = (s: string) => `${headingId}-${s}`;

  // Display: only what the chosen chart uses.
  const display = metric && !isText ? [
    !groupingBlocked(widget) && (
      <OptionChips<Grouping | "auto">
        key="grouping"
        label="Time grouping"
        value={widget.grouping ?? "auto"}
        onChange={(g) => set({ grouping: g === "auto" ? undefined : g })}
        options={(["auto", "day", "week", "month"] as const).map((g) => ({ value: g, label: { auto: "Automatic", day: "Daily", week: "Weekly", month: "Monthly" }[g] }))}
        hint={widget.grouping ? undefined : autoGroupingHint(widget.type)}
      />
    ),
    !sortBlocked(widget) && (
      <OptionChips<WidgetSort>
        key="sort"
        label="Sort"
        value={widget.sort}
        onChange={(sort) => set({ sort })}
        options={(["desc", "asc", "name"] as const).map((s) => ({ value: s, label: { desc: "Biggest first", asc: "Smallest first", name: "A to Z" }[s] }))}
        hint="Other always stays last."
      />
    ),
    !showValuesBlocked(widget) && <Toggle key="values" label="Show values on the chart" checked={widget.showValues} onChange={(showValues) => set({ showValues })} />,
    !percentBlocked(widget) && <Toggle key="percent" label="Show as % of total" checked={!!widget.percent} onChange={(percent) => set({ percent })} hint="Each part as a share of its total." />,
    !compareBlocked(widget) && <Toggle key="compare" label="Compare to previous period" checked={widget.compare} onChange={(compare) => set({ compare })} />,
  ].filter(Boolean) : [];

  return (
    <aside
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); requestClose(); }
      }}
      className="flex w-[540px] shrink-0 flex-col border-l border-slate-200 bg-white"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <h2 id={headingId} ref={heading} tabIndex={-1} className="text-base font-semibold text-slate-800 focus:outline-none">
          {mode === "add" ? "Add widget" : "Edit widget"}
        </h2>
        <button type="button" onClick={requestClose} aria-label="Close panel" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 px-5 pb-5">

        <Section id={id("intent")} title="What do you want to see?">
          {/* Each one's chart and when to use it is its tooltip, and is read out with it. */}
          <div role="radiogroup" aria-labelledby={id("intent")} className="grid grid-cols-3 gap-1.5">
            {intents.map(({ id: i, short, hint }) => {
              const Icon = INTENT_ICON[i];
              const on = intent === i;
              return (
                <label key={i} title={hint} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40", on ? "border-zeno-teal bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                  <input type="radio" name={id("intent")} checked={on} aria-describedby={id(`intent-${i}`)} onChange={() => set({ type: chartForIntent(i) })} className="sr-only" />
                  <Icon className={cn("h-4 w-4 shrink-0", on ? "text-zeno-teal" : "text-slate-500")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium leading-tight text-slate-800">{short}</span>
                    {recommended === i && <span className="block text-[11px] font-medium leading-tight text-zeno-teal">Recommended</span>}
                  </span>
                  <span id={id(`intent-${i}`)} className="sr-only">{hint}</span>
                </label>
              );
            })}
          </div>
        </Section>

        {isText ? (
          <>
            <Section id={id("heading")} title="Heading" as="label">
              <input id={`${id("heading")}-field`} value={widget.title} maxLength={80} onChange={(e) => { setTitleEdited(true); onChange({ ...widget, title: e.target.value }); }} className={FIELD} />
            </Section>
            <div>
              <label htmlFor={id("text")} className={FIELD_LABEL}>Text <span className="font-normal text-slate-500">(optional)</span></label>
              <textarea id={id("text")} rows={4} maxLength={600} value={widget.text ?? ""} onChange={(e) => onChange({ ...widget, text: e.target.value })} className={cn(FIELD, "resize-y")} />
            </div>
          </>
        ) : (
          <>
            <Section id={id("metric")} title="Metric">
              <MetricPicker value={metric} category={category} labelledBy={id("metric")} onChange={(m) => set({ metricId: m.id })} />
            </Section>

            {metric && (
              <Section id={id("range")} title="Time range" as={rangeBlocked(widget) ? "h3" : "label"}>
                {rangeBlocked(widget) ? (
                  <p className="text-sm text-slate-600">Current value: the date range doesn’t apply. A line or stacked bar shows it over time.</p>
                ) : (
                  <select
                    id={`${id("range")}-field`}
                    value={widget.range?.preset ?? ""}
                    onChange={(e) => {
                      if (e.target.value === widget.range?.preset) return;
                      set({ range: e.target.value ? { preset: e.target.value as (typeof RANGE_PRESETS)[number]["value"] } : undefined });
                    }}
                    className={FIELD}
                  >
                    <option value="">Same as the dashboard ({rangeWithDates(filters.range, today)})</option>
                    {RANGE_PRESETS.map((p) => <option key={p.value} value={p.value}>{rangeWithDates({ preset: p.value }, today)}</option>)}
                    {widget.range && !RANGE_PRESETS.some((p) => p.value === widget.range!.preset) && <option value={widget.range.preset}>{rangeLabel(widget.range)}</option>}
                  </select>
                )}
              </Section>
            )}

            {metric && (
              <Section id={id("filters")} title="Filters">
                <WidgetFilters
                  metric={metric}
                  value={widget.filters ?? []}
                  dashboard={filters}
                  noOverlap={!!widgetQuery(widget, filters, today)?.noOverlap}
                  onChange={(f) => set({ filters: f })}
                />
              </Section>
            )}

            {metric && widget.type !== "kpi" && splitOptions.length > 0 && (
              <Section id={id("split")} title="Breakdown">
                <div className="space-y-3">
                  <OptionChips<PropertyId | "none">
                    label="Break down by"
                    hideLabel
                    value={widget.splitBy ?? "none"}
                    onChange={(p) => set({ splitBy: p === "none" ? undefined : p })}
                    options={[
                      ...(needsSplit ? [] : [{ value: "none" as const, label: "None" }]),
                      ...splitOptions.map((p) => ({ value: p, label: PROPERTIES[p].name })),
                    ]}
                    hint={`One breakdown per widget. Shows the ${topFor(widget.type)} biggest, then Other${widget.type === "line" || widget.type === "stacked" ? " in grey" : ""}.`}
                  />
                  {canSwitch(widget.type) && widget.splitBy && (
                    <BreakdownTabsSetting metric={metric} widget={widget} onChange={(switchable) => set({ switchable })} />
                  )}
                </div>
              </Section>
            )}

            {display.length > 0 && (
              <Section id={id("display")} title="Display">
                <div className="space-y-3">{display}</div>
              </Section>
            )}

            {metric && (
              <section aria-labelledby={id("title")}>
                <div className={cn(STICKY, "flex items-baseline justify-between")}>
                  <label id={id("title")} htmlFor={`${id("title")}-field`}>Title</label>
                  {titleEdited && (
                    <button type="button" onClick={() => { setTitleEdited(false); onChange({ ...widget, title: autoTitle(widget) }); }} className="rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
                      Use automatic title
                    </button>
                  )}
                </div>
                <input id={`${id("title")}-field`} value={widget.title} maxLength={80} onChange={(e) => { setTitleEdited(true); onChange({ ...widget, title: e.target.value }); }} className={FIELD} />
                {!titleEdited && <p className="mt-1 text-xs text-slate-500">Filled in from the metric and breakdown. Type to change it.</p>}
              </section>
            )}
          </>
        )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
        {confirming ? (
          <InlineConfirm
            question="Discard changes?"
            detail={
              switchRequest
                ? "To open the other widget, the changes to this one won’t be kept."
                : mode === "add" ? "This widget won’t be added." : "Your changes to this widget won’t be kept."
            }
            onDiscard={() => { setConfirmDiscard(false); if (switchRequest) switchRequest.onDiscard(); else onClose(); }}
            onKeep={keepEditing}
          />
        ) : (
        <>
        {!valid && <p id={id("why")} className="mr-auto text-xs text-slate-500">{isText ? "Add a heading or some text first" : "Choose a metric first"}</p>}
        <Button ref={cancelButton} variant="ghost" onClick={requestClose}>Cancel</Button>
        <Button
          variant="teal"
          onClick={() => onSubmit(widget)}
          disabled={!valid}
          aria-describedby={!valid ? id("why") : undefined}
          title={!valid ? (isText ? "Add a heading or some text first" : "Choose a metric first") : undefined}
        >
          {mode === "add" ? "Add widget" : "Save widget"}
        </Button>
        </>
        )}
      </div>
    </aside>
  );
}

/**
 * "Let viewers switch breakdown": on, the widget shows a tab per chosen
 * property and viewers switch between them without saving anything. Up to
 * four properties, only ones this widget can be broken down by; the current
 * breakdown is always one of them.
 */
function BreakdownTabsSetting({ metric, widget, onChange }: { metric: Metric; widget: Widget; onChange: (p: PropertyId[] | undefined) => void }) {
  const id = useId();
  const split = widget.splitBy!;
  const on = !!widget.switchable;
  const chosen = widget.switchable ?? [split];
  const valid = PROPERTY_ORDER.filter((p) => !splitBlocked(widget.type, metric, p));
  const turnOn = () => onChange([split, ...valid.filter((p) => p !== split)].slice(0, Math.min(SWITCH_MAX, 3)));
  return (
    <div>
      <Toggle label="Let viewers switch breakdown" checked={on} onChange={(v) => (v ? turnOn() : onChange(undefined))} hint={on ? undefined : "Viewers get a tab for each breakdown you choose. Switching isn’t saved."} />
      {on && (
        <div role="group" aria-labelledby={`${id}-label`} className="ml-[26px] mt-2">
          <p id={`${id}-label`} className="mb-1.5 text-xs font-medium text-slate-700">Tabs, up to {SWITCH_MAX}</p>
          <div className="flex flex-wrap gap-1.5">
            {valid.map((p) => {
              const picked = chosen.includes(p);
              const why = p === split ? "The widget’s own breakdown is always a tab" : !picked && chosen.length >= SWITCH_MAX ? `Up to ${SWITCH_MAX} tabs` : null;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={picked}
                  aria-disabled={!!why}
                  title={why ?? undefined}
                  onClick={() => { if (!why) onChange(picked ? chosen.filter((x) => x !== p) : [...chosen, p]); }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                    picked ? "border-zeno-teal bg-zeno-teal text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                    why && (picked ? "cursor-default" : "cursor-not-allowed opacity-50")
                  )}
                >
                  {PROPERTIES[p].name}
                </button>
              );
            })}
          </div>
          {chosen.length < 2 && <p className="mt-1.5 text-xs text-slate-500">Choose at least one more to show tabs.</p>}
        </div>
      )}
    </div>
  );
}

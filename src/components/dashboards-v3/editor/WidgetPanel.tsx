"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BarChart3, Hash, Table2, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { metricById, PROPERTIES, PROPERTY_ORDER, type CategoryId, type ChartType, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { RANGE_PRESETS, rangeLabel, rangeWithDates, WEEKLY_AFTER_DAYS } from "@/lib/dashboards-v3/dates";
import {
  autoTitle, chartChoiceBlocked, chartForIntent, compareBlocked, goalBlocked, groupingBlocked, normalise, rangeBlocked, sameWidget, showValuesBlocked, sortBlocked,
} from "@/lib/dashboards-v3/editor";
import { UNIT_LABEL } from "@/lib/dashboards-v3/format";
import {
  allowedSizes, CHART_LABEL, INTENTS, intentOf, SIZE_LABEL, splitBlocked, topFor, type Intent,
} from "@/lib/dashboards-v3/rules";
import type { DashboardFilters, Grouping, Widget, WidgetSize, WidgetSort } from "@/lib/dashboards-v3/types";
import { activeFilters, widgetQuery } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { InlineConfirm } from "../ui/InlineConfirm";
import { Disclosure, FIELD, FIELD_LABEL, OptionChips, Toggle } from "./controls";
import { MetricPicker } from "./MetricPicker";
import { WidgetFilters } from "./WidgetFilters";

const INTENT_ICON: Record<Intent, typeof Hash> = { number: Hash, trend: TrendingUp, comparison: BarChart3, list: Table2 };
const CHARTS: ChartType[] = ["kpi", "line", "bar", "stacked", "table"];
/** A section heading that stays at the top of the panel's scroll area while its section is in view. */
const STICKY = "sticky top-0 z-10 -mx-5 bg-white px-5 py-2 text-sm font-semibold text-slate-800";

/**
 * Adding or editing a widget, edit mode only, beside the dashboard rather
 * than over it. The widget in the grid (or the dashed placeholder for a new
 * one) is the live preview; nothing reaches the dashboard's draft until Add
 * widget or Save widget.
 *
 * Choices come in layers: what to see, the metric, its time range and
 * title; then Refine and More options, both collapsed. Section headings stay
 * in view as the options scroll. Choices that don't fit the data stay
 * visible, greyed, with the reason.
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
  const [sizeChosen, setSizeChosen] = useState(mode === "edit");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lastMetric = useRef(widget.metricId);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const metric = metricById(widget.metricId);
  const isText = widget.type === "text";
  const intent = intentOf(widget.type);
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
  function set(patch: Partial<Widget>, opts: { size?: boolean } = {}) {
    if (opts.size) setSizeChosen(true);
    let next: Widget = { ...widget, ...patch };
    if (next.type !== "text" && !next.metricId) next.metricId = lastMetric.current;
    if (next.metricId) lastMetric.current = next.metricId;
    next = normalise(next, sizeChosen || !!opts.size);
    if (!titleEdited) next.title = autoTitle(next);
    onChange(next);
  }

  const splitTop = topFor(widget.type);
  const refineSummary = [
    activeFilters(widget).length > 0 && `${activeFilters(widget).length} filter${activeFilters(widget).length > 1 ? "s" : ""}`,
    widget.splitBy && `Split by ${PROPERTIES[widget.splitBy].name.toLowerCase()}`,
    widget.compare && "Compared",
  ].filter(Boolean).join(" · ");
  const moreSummary = [
    widget.grouping && { day: "Daily", week: "Weekly", month: "Monthly" }[widget.grouping],
    widget.goal !== undefined && "Goal",
    widget.showValues && "Values",
    SIZE_LABEL[widget.size],
  ].filter(Boolean).join(" · ");

  return (
    <aside
      aria-labelledby={headingId}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); requestClose(); }
      }}
      className="flex w-[520px] shrink-0 flex-col border-l border-slate-200 bg-white"
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
        <div className="space-y-5 px-5 pb-4">

        <section aria-labelledby={`${headingId}-intent`}>
          <h3 id={`${headingId}-intent`} className={STICKY}>What do you want to see?</h3>
          {/* One row of four; each one's description is its tooltip and is read out with it. */}
          <div role="radiogroup" aria-labelledby={`${headingId}-intent`} className="grid grid-cols-4 gap-1.5">
            {INTENTS.map(({ id, short, hint }) => {
              const Icon = INTENT_ICON[id];
              const on = intent === id;
              return (
                <label key={id} title={hint} className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors focus-within:ring-2 focus-within:ring-zeno-teal/40", on ? "border-zeno-teal bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                  <input type="radio" name={`${headingId}-intent`} checked={on} aria-describedby={`${headingId}-intent-${id}`} onChange={() => set({ type: chartForIntent(id) })} className="sr-only" />
                  <Icon className={cn("h-4 w-4", on ? "text-zeno-teal" : "text-slate-500")} aria-hidden />
                  <span className="text-xs font-medium text-slate-800">{short}</span>
                  <span id={`${headingId}-intent-${id}`} className="sr-only">{hint}</span>
                </label>
              );
            })}
          </div>
        </section>

        {isText ? (
          <>
            <div>
              <label htmlFor={`${headingId}-title`} className={FIELD_LABEL}>Heading</label>
              <input id={`${headingId}-title`} value={widget.title} maxLength={80} onChange={(e) => { setTitleEdited(true); onChange({ ...widget, title: e.target.value }); }} className={FIELD} />
            </div>
            <div>
              <label htmlFor={`${headingId}-text`} className={FIELD_LABEL}>Text <span className="font-normal text-slate-500">(optional)</span></label>
              <textarea id={`${headingId}-text`} rows={4} maxLength={600} value={widget.text ?? ""} onChange={(e) => onChange({ ...widget, text: e.target.value })} className={cn(FIELD, "resize-y")} />
            </div>
            <OptionChips<WidgetSize>
              label="Size"
              value={widget.size}
              onChange={(size) => set({ size }, { size: true })}
              options={(["quarter", "half", "full"] as WidgetSize[]).map((s) => ({ value: s, label: SIZE_LABEL[s] }))}
            />
          </>
        ) : (
          <>
            <section aria-labelledby={`${headingId}-metric`}>
              <h3 id={`${headingId}-metric`} className={STICKY}>Metric</h3>
              <MetricPicker value={metric} category={category} hideLabel onChange={(m) => set({ metricId: m.id })} />
            </section>

            <section>
              <label htmlFor={`${headingId}-range`} className={cn(STICKY, "block")}>Time range</label>
              <select
                id={`${headingId}-range`}
                disabled={!!rangeBlocked(widget)}
                aria-describedby={rangeBlocked(widget) ? `${headingId}-range-why` : undefined}
                value={widget.range?.preset ?? ""}
                onChange={(e) => {
                  if (e.target.value === widget.range?.preset) return;
                  set({ range: e.target.value ? { preset: e.target.value as (typeof RANGE_PRESETS)[number]["value"] } : undefined });
                }}
                className={cn(FIELD, "disabled:bg-slate-50 disabled:text-slate-500")}
              >
                <option value="">{rangeBlocked(widget) ? "Current value" : `Same as the dashboard (${rangeWithDates(filters.range, today)})`}</option>
                {RANGE_PRESETS.map((p) => <option key={p.value} value={p.value}>{rangeWithDates({ preset: p.value }, today)}</option>)}
                {widget.range && !RANGE_PRESETS.some((p) => p.value === widget.range!.preset) && <option value={widget.range.preset}>{rangeLabel(widget.range)}</option>}
              </select>
              {rangeBlocked(widget) && <p id={`${headingId}-range-why`} className="mt-1 text-xs text-slate-500">{rangeBlocked(widget)}</p>}
            </section>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label htmlFor={`${headingId}-title`} className="text-sm font-medium text-slate-700">Title</label>
                {titleEdited && (
                  <button type="button" onClick={() => { setTitleEdited(false); onChange({ ...widget, title: autoTitle(widget) }); }} className="rounded text-xs font-medium text-zeno-teal hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40">
                    Use automatic title
                  </button>
                )}
              </div>
              <input id={`${headingId}-title`} value={widget.title} maxLength={80} onChange={(e) => { setTitleEdited(true); onChange({ ...widget, title: e.target.value }); }} className={FIELD} />
              {!titleEdited && <p className="mt-1 text-xs text-slate-500">Filled in from the metric and split. Type to change it.</p>}
            </div>

            {metric && (
              <Disclosure sticky title="Refine" summary={refineSummary || "No filter or split"}>
                <WidgetFilters
                  metric={metric}
                  value={widget.filters ?? []}
                  dashboard={filters}
                  noOverlap={!!widgetQuery(widget, filters, today)?.noOverlap}
                  onChange={(f) => set({ filters: f })}
                />

                <OptionChips<PropertyId | "none">
                  label="Split by"
                  value={widget.splitBy ?? "none"}
                  onChange={(p) => set({ splitBy: p === "none" ? undefined : p })}
                  options={[
                    { value: "none", label: "None", blocked: widget.type === "bar" || widget.type === "stacked" ? `A ${CHART_LABEL[widget.type].toLowerCase()} chart needs a split` : null },
                    ...PROPERTY_ORDER.map((p) => ({ value: p, label: PROPERTIES[p].name, blocked: splitBlocked(widget.type, metric, p) })),
                  ]}
                  hint={widget.type === "kpi" ? undefined : `One split per widget. Shows the ${splitTop} biggest, then Other${widget.type === "line" || widget.type === "stacked" ? " in grey (5 colours at most)" : ""}.`}
                />

                <Toggle label="Compare to previous period" checked={widget.compare} onChange={(compare) => set({ compare })} blocked={compareBlocked(widget)} />

                <OptionChips<ChartType>
                  label="Change chart"
                  value={widget.type}
                  onChange={(type) => set({ type })}
                  options={CHARTS.map((c) => ({ value: c, label: CHART_LABEL[c], blocked: chartChoiceBlocked(c, widget) }))}
                />
              </Disclosure>
            )}

            {metric && (
              <Disclosure sticky title="More options" summary={moreSummary}>
                <OptionChips<Grouping | "auto">
                  label="Time grouping"
                  value={widget.grouping ?? "auto"}
                  onChange={(g) => set({ grouping: g === "auto" ? undefined : g })}
                  options={(["auto", "day", "week", "month"] as const).map((g) => ({
                    value: g,
                    label: { auto: "Automatic", day: "Daily", week: "Weekly", month: "Monthly" }[g],
                    blocked: groupingBlocked(widget),
                  }))}
                  hint={groupingBlocked(widget) ? undefined : `Automatic is daily, or weekly for ranges over ${WEEKLY_AFTER_DAYS} days.`}
                />

                <div>
                  <label htmlFor={`${headingId}-goal`} className={cn(FIELD_LABEL, goalBlocked(widget) && "text-slate-400")}>Goal line</label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`${headingId}-goal`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      disabled={!!goalBlocked(widget)}
                      value={widget.goal ?? ""}
                      onChange={(e) => set({ goal: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })}
                      placeholder="No goal"
                      aria-describedby={`${headingId}-goal-note`}
                      className={cn(FIELD, "w-40 disabled:bg-slate-50 disabled:text-slate-400")}
                    />
                    <span className="text-sm text-slate-600">{UNIT_LABEL[metric.unit]}</span>
                  </div>
                  <p id={`${headingId}-goal-note`} className="mt-1 text-xs text-slate-500">{goalBlocked(widget) ?? "Drawn as a dashed line across the chart."}</p>
                </div>

                <Toggle label="Show values on the chart" checked={widget.showValues} onChange={(showValues) => set({ showValues })} blocked={showValuesBlocked(widget)} />

                <OptionChips<WidgetSort>
                  label="Sort"
                  value={widget.sort}
                  onChange={(sort) => set({ sort })}
                  options={(["desc", "asc", "name"] as const).map((s) => ({ value: s, label: { desc: "Biggest first", asc: "Smallest first", name: "A to Z" }[s], blocked: sortBlocked(widget) }))}
                  hint={sortBlocked(widget) ? undefined : "Other always stays last."}
                />

                <OptionChips<WidgetSize>
                  label="Size"
                  value={widget.size}
                  onChange={(size) => set({ size }, { size: true })}
                  options={(["quarter", "half", "full"] as WidgetSize[]).map((s) => ({
                    value: s,
                    label: SIZE_LABEL[s],
                    blocked: allowedSizes(widget.type).includes(s) ? null : widget.type === "kpi" ? "A number fits ¼ or ½ width" : "Charts and tables need at least ½ width",
                  }))}
                />
              </Disclosure>
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
                : mode === "add" ? "This widget won’t be added." : "Your changes to this widget won’t be saved."
            }
            onDiscard={() => { setConfirmDiscard(false); if (switchRequest) switchRequest.onDiscard(); else onClose(); }}
            onKeep={keepEditing}
          />
        ) : (
        <>
        {!valid && <p id={`${headingId}-why`} className="mr-auto text-xs text-slate-500">{isText ? "Add a heading or some text first" : "Choose a metric first"}</p>}
        <Button ref={cancelButton} variant="ghost" onClick={requestClose}>Cancel</Button>
        <Button
          variant="teal"
          onClick={() => onSubmit(widget)}
          disabled={!valid}
          aria-describedby={!valid ? `${headingId}-why` : undefined}
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

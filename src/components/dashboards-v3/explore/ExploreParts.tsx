"use client";

import { useState } from "react";
import { ChartBar, ChartColumnStacked, ChartLine, ChevronDown, Copy, LayoutDashboard, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, PROPERTIES, PROPERTY_ORDER, type CategoryId, type ChartType, type Metric, type PropertyId } from "@/lib/dashboards-v3/catalogue";
import { chartChoiceBlocked } from "@/lib/dashboards-v3/editor";
import { EXPLORE_CHARTS, type Summary } from "@/lib/dashboards-v3/explore";
import { fmtCompact, fmtValue, unitWords } from "@/lib/dashboards-v3/format";
import { CHANGE_CLASS } from "@/lib/dashboards-v3/palette";
import { CHART_LABEL, splitBlocked } from "@/lib/dashboards-v3/rules";
import { lastEdited } from "@/lib/dashboards-v3/templates";
import type { Dashboard, Widget } from "@/lib/dashboards-v3/types";
import { atLimit, MAX_WIDGETS_NOTE } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast";
import { NAME_MAX } from "../DashboardDialogs";
import { Dialog } from "../ui/Dialog";
import { RowMenu, type MenuItem } from "../ui/RowMenu";
import { LOWER_IS_BETTER } from "../widgets/KpiWidget";

const HEADING = "mb-1.5 text-sm font-semibold text-slate-800";
/** Outline chips that read as clickable; the chosen one is filled. */
const CHIP = "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";
const CHIP_OFF = "border-slate-300 bg-white text-slate-700 hover:border-zeno-teal hover:text-zeno-teal";
const CHIP_ON = "border-zeno-teal bg-zeno-teal text-white";
const VISIBLE = 4;

/**
 * Break down by: None and the four most useful properties as chips, the
 * rest under More ▾, where ones the metric can't use are greyed with why.
 */
export function BreakdownChips({ metric, type, value, onChange }: { metric: Metric; type: ChartType; value: PropertyId | undefined; onChange: (p: PropertyId | undefined) => void }) {
  const valid = PROPERTY_ORDER.filter((p) => !splitBlocked(type, metric, p));
  const ordered = metric.defaultSplit && valid.includes(metric.defaultSplit) ? [metric.defaultSplit, ...valid.filter((p) => p !== metric.defaultSplit)] : valid;
  const shown = ordered.slice(0, VISIBLE);
  if (value && !shown.includes(value)) shown.push(value);
  const rest = PROPERTY_ORDER.filter((p) => !shown.includes(p));
  const more: MenuItem[] = rest.map((p) => ({ label: PROPERTIES[p].name, icon: Plus, blocked: splitBlocked(type, metric, p), onSelect: () => onChange(p) }));
  const chip = (label: string, on: boolean, select: () => void) => (
    <button key={label} type="button" role="radio" aria-checked={on} onClick={select} className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}>{label}</button>
  );
  return (
    <div>
      <p id="explore-breakdown" className={HEADING}>Break down by</p>
      <div role="radiogroup" aria-labelledby="explore-breakdown" className="flex flex-wrap items-center gap-1.5">
        {chip("None", !value, () => onChange(undefined))}
        {shown.map((p) => chip(PROPERTIES[p].name, value === p, () => onChange(p)))}
        {more.length > 0 && (
          <RowMenu
            label="More properties to break down by"
            items={more}
            trigger={<>More <ChevronDown className="h-3.5 w-3.5" aria-hidden /></>}
            triggerClassName={cn(CHIP, CHIP_OFF, "inline-flex items-center gap-1")}
          />
        )}
      </div>
    </div>
  );
}

const CHART_ICON: Record<string, typeof ChartLine> = { line: ChartLine, bar: ChartBar, stacked: ChartColumnStacked, table: Table2 };

/** Chart: an icon segmented control of the chart types that can show this view, each named in a tooltip on hover and focus. */
export function ChartSwitch({ widget, onChange }: { widget: Widget; onChange: (t: ChartType) => void }) {
  const choices = EXPLORE_CHARTS.filter((c) => !chartChoiceBlocked(c, widget));
  return (
    <div>
      <p id="explore-chart" className={HEADING}>Chart</p>
      <div role="radiogroup" aria-labelledby="explore-chart" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
        {choices.map((c) => {
          const Icon = CHART_ICON[c];
          const on = widget.type === c;
          return (
            <span key={c} className="group relative inline-flex">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={CHART_LABEL[c]}
                onClick={() => onChange(c)}
                className={cn("rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40", on ? "bg-zeno-teal text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
              <Tip text={CHART_LABEL[c]} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** A name shown above its icon button on hover and keyboard focus; the button's aria-label says the same. */
function Tip({ text }: { text: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block group-has-[:focus-visible]:block">
      {text}
    </span>
  );
}

/**
 * The results' first row, compact: the number with its unit and its change
 * vs the previous period, and an icon button that copies the answer as a
 * sentence. With no data, it says why instead.
 */
export function SummaryRow({ metric, summary }: { metric: Metric; summary: Summary }) {
  const words = unitWords(metric);
  async function copy() {
    try {
      await navigator.clipboard.writeText(summary.full);
      toast.success("Summary copied");
    } catch {
      toast.error("Couldn’t copy the summary", "Select the text and copy it yourself.");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      {summary.figures.map((f) => {
        const c = f.change;
        const tone = !c || c.good === null ? "flat" : c.good ? "good" : "bad";
        return (
          <div key={f.label ?? "total"}>
            {f.label && <p className="text-xs font-medium text-slate-600">{f.label}</p>}
            <p className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums" title={fmtValue(f.value, metric, false)}>
              <span className="text-2xl font-semibold text-slate-800">{fmtCompact(f.value, metric)}{metric.unit === "%" ? "%" : ""}</span>
              {words && <span className="text-sm text-slate-500">{words}</span>}
            </p>
            {c && (
              <p className={cn("mt-1 flex flex-wrap items-center gap-x-1 text-xs font-medium tabular-nums", CHANGE_CLASS[tone])} title={metric.higherIsBetter === false ? LOWER_IS_BETTER : undefined}>
                <span aria-hidden>{c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "●"}</span>
                <span>{c.direction === "flat" ? "No change" : c.text}</span>
                <span className="font-normal text-slate-600">{summary.versus}</span>
              </p>
            )}
          </div>
        );
      })}
      {summary.figures.length === 0 && <p role="status" className="flex-1 text-sm text-slate-700">{summary.context}</p>}
      <span className="group relative ml-auto inline-flex self-start">
        <button
          type="button"
          aria-label="Copy summary"
          onClick={() => { void copy(); }}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
        >
          <Copy className="h-4 w-4" aria-hidden />
        </button>
        <Tip text="Copy summary" />
      </span>
    </div>
  );
}

const RECENT = 5;

/**
 * Add to dashboard ▾: your five most recently edited dashboards, then "All
 * my dashboards…" (every one of yours, in a dialog) and "New dashboard…"
 * (a new one holding just this widget). Never a template or someone else's.
 */
export function AddToDashboard({
  own, widget, metric, onAdd, onCreate,
}: {
  own: Dashboard[]; widget: Widget | null; metric: Metric | undefined;
  onAdd: (d: Dashboard) => void;
  onCreate: (name: string, category: CategoryId) => void;
}) {
  const [dialog, setDialog] = useState<"all" | "new" | null>(null);
  const recent = [...own].sort((a, b) => lastEdited(b).localeCompare(lastEdited(a))).slice(0, RECENT);
  const noMetric = !widget || !metric ? "Choose a metric first" : null;
  const items: MenuItem[] = [
    ...recent.map((d) => ({ label: d.name, icon: LayoutDashboard, blocked: noMetric ?? (atLimit(d.widgets) ? MAX_WIDGETS_NOTE : null), onSelect: () => onAdd(d) })),
    { label: "All my dashboards…", icon: LayoutDashboard, blocked: noMetric ?? (own.length === 0 ? "You don’t have a dashboard of your own yet" : null), onSelect: () => setDialog("all") },
    { label: "New dashboard…", icon: Plus, blocked: noMetric, onSelect: () => setDialog("new") },
  ];
  return (
    <>
      <RowMenu
        label="Add to dashboard"
        items={items}
        trigger={<>Add to dashboard <ChevronDown className="h-4 w-4" aria-hidden /></>}
        triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      />
      {dialog === "all" && <AllDashboardsDialog own={own} onClose={() => setDialog(null)} onAdd={(d) => { setDialog(null); onAdd(d); }} />}
      {dialog === "new" && metric && (
        <NewDashboardDialog metric={metric} onClose={() => setDialog(null)} onCreate={(name, category) => { setDialog(null); onCreate(name, category); }} />
      )}
    </>
  );
}

function AllDashboardsDialog({ own, onClose, onAdd }: { own: Dashboard[]; onClose: () => void; onAdd: (d: Dashboard) => void }) {
  const sorted = [...own].sort((a, b) => a.name.localeCompare(b.name));
  const [chosen, setChosen] = useState<string | null>(sorted.find((d) => !atLimit(d.widgets))?.id ?? null);
  const target = sorted.find((d) => d.id === chosen);
  return (
    <Dialog
      open
      onClose={onClose}
      title="Add to a dashboard"
      subtitle="Your dashboards"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="teal" disabled={!target} onClick={() => target && onAdd(target)}>Add</Button></>}
    >
      <div role="radiogroup" aria-label="Your dashboards" className="max-h-80 space-y-1 overflow-y-auto">
        {sorted.map((d) => {
          const full = atLimit(d.widgets);
          return (
            <label key={d.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm", full ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-800 hover:bg-slate-50")} title={full ? MAX_WIDGETS_NOTE : undefined}>
              <input type="radio" name="explore-add-target" disabled={full} checked={chosen === d.id} onChange={() => setChosen(d.id)} className="h-4 w-4 accent-[#003B49]" />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs text-slate-500">{full ? "Full" : `${d.widgets.length} widget${d.widgets.length === 1 ? "" : "s"}`}</span>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}

function NewDashboardDialog({ metric, onClose, onCreate }: { metric: Metric; onClose: () => void; onCreate: (name: string, category: CategoryId) => void }) {
  const [name, setName] = useState(metric.name);
  const [category, setCategory] = useState<CategoryId>(metric.category);
  const [tried, setTried] = useState(false);
  const error = !name.trim() ? "Enter a name" : null;
  return (
    <Dialog
      open
      onClose={onClose}
      title="New dashboard"
      subtitle="With this widget on it, only you can see it"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="teal" onClick={() => { setTried(true); if (!error) onCreate(name.trim(), category); }}>Create and add</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Input id="explore-new-name" label="Name" value={name} maxLength={NAME_MAX} autoFocus onChange={(e) => setName(e.target.value)} aria-invalid={tried && !!error} aria-describedby={tried && error ? "explore-new-name-error" : undefined} />
          {tried && error && <p id="explore-new-name-error" className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div>
          <label htmlFor="explore-new-category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select id="explore-new-category" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20">
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
    </Dialog>
  );
}

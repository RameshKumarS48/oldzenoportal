"use client";

import { useState } from "react";
import { Check, Lightbulb, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardDraft } from "@/lib/dashboards-v3/ai-draft";
import { readingLine } from "@/lib/dashboards-v3/ai-draft";
import { CATEGORIES, metricById, PROPERTIES, type CategoryId } from "@/lib/dashboards-v3/catalogue";
import { RANGE_PRESETS } from "@/lib/dashboards-v3/dates";
import { CHART_LABEL } from "@/lib/dashboards-v3/rules";
import type { RangePreset, Visibility } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";

const CHIP = "inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white py-0.5 pl-2.5 pr-1 text-xs text-slate-700";
const CHIP_SELECT =
  "rounded-full border border-slate-300 bg-white py-0.5 pl-2.5 pr-7 text-xs font-medium text-slate-800 focus:border-zeno-teal focus:outline-none focus:ring-2 focus:ring-zeno-teal/20";
const X_BUTTON = "rounded-full p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="w-20 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

/**
 * The drafted dashboard, every part editable as a chip before anything is
 * saved. Create dashboard opens it to view, Open in editor opens it to edit,
 * Discard drops it.
 */
export function DraftPreview({
  draft, onChange, onCreate, onDiscard,
}: {
  draft: DashboardDraft;
  onChange: (d: DashboardDraft) => void;
  onCreate: (then: "view" | "edit") => void;
  onDiscard: () => void;
}) {
  const [naming, setNaming] = useState<string | null>(null);
  const set = (patch: Partial<DashboardDraft>) => onChange({ ...draft, ...patch });
  const nameError = !draft.name.trim();
  const commitName = () => { if (naming !== null && naming.trim()) set({ name: naming.trim() }); setNaming(null); };
  const regionsLeft = PROPERTIES.region.values.filter((r) => !draft.regions.includes(r));

  return (
    <section aria-label="Draft dashboard" className="mt-3 rounded-xl border border-zeno-teal/30 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">Draft dashboard</h3>
        <span className="text-xs text-slate-500">Not saved yet</span>
      </div>

      <div className="mt-3 space-y-2.5">
        <Row label="Name">
          {naming !== null ? (
            <input
              autoFocus
              aria-label="Dashboard name"
              value={naming}
              maxLength={60}
              onChange={(e) => setNaming(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitName(); }
                if (e.key === "Escape") { e.preventDefault(); setNaming(null); }
              }}
              className="min-w-[260px] rounded-full border border-zeno-teal bg-white px-3 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-zeno-teal/20"
            />
          ) : (
            <button type="button" onClick={() => setNaming(draft.name)} className={cn(CHIP, "pr-2 font-medium text-slate-800 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40")}>
              {draft.name}
              <Pencil className="h-3 w-3 text-slate-500" aria-hidden />
              <span className="sr-only">, rename</span>
            </button>
          )}
        </Row>

        <Row label="Category">
          <select aria-label="Category" value={draft.category} onChange={(e) => set({ category: e.target.value as CategoryId })} className={CHIP_SELECT}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Row>

        <Row label="Widgets">
          {draft.widgets.map((w) => (
            <span key={w.id} className={CHIP}>
              <span className="text-slate-500">{CHART_LABEL[w.type]} ·</span>
              <span className="font-medium">{w.title || metricById(w.metricId)?.name}</span>
              <button type="button" onClick={() => set({ widgets: draft.widgets.filter((x) => x.id !== w.id) })} aria-label={`Remove widget ${w.title}`} className={X_BUTTON}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {draft.widgets.length === 0 && <span className="text-xs text-slate-500">No widgets: the dashboard will start blank, with suggestions.</span>}
        </Row>

        <Row label="Filters">
          <select
            aria-label="Date range"
            value={draft.range.preset}
            onChange={(e) => set({ range: { preset: e.target.value as RangePreset } })}
            className={CHIP_SELECT}
          >
            {RANGE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {draft.regions.map((r) => (
            <span key={r} className={CHIP}>
              <span className="text-slate-500">Region:</span>
              <span className="font-medium">{r}</span>
              <button type="button" onClick={() => set({ regions: draft.regions.filter((x) => x !== r) })} aria-label={`Remove region ${r}`} className={X_BUTTON}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <label className="relative inline-flex items-center">
            <span className="sr-only">Add a region</span>
            <Plus className="pointer-events-none absolute left-2 h-3 w-3 text-slate-500" aria-hidden />
            <select
              value=""
              onChange={(e) => { if (e.target.value) set({ regions: PROPERTIES.region.values.filter((v) => v === e.target.value || draft.regions.includes(v)) }); }}
              className={cn(CHIP_SELECT, "border-dashed pl-6 font-normal text-slate-600")}
            >
              <option value="">Region</option>
              {regionsLeft.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </Row>

        <Row label="Visibility">
          <select aria-label="Visibility" value={draft.visibility} onChange={(e) => set({ visibility: e.target.value as Visibility })} className={CHIP_SELECT}>
            <option value="private">Only you</option>
            <option value="team">Team</option>
          </select>
        </Row>
      </div>

      <p className="mt-3 flex items-start gap-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
        <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        <span><span className="font-medium text-slate-700">How I read this:</span> {readingLine(draft.reading)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="teal" size="sm" onClick={() => onCreate("view")} disabled={nameError}>
          <Check className="h-4 w-4" /> Create dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={() => onCreate("edit")} disabled={nameError}>
          <Pencil className="h-4 w-4" /> Open in editor
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard}>Discard</Button>
      </div>
    </section>
  );
}

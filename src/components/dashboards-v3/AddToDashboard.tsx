"use client";

import { useState } from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_WIDGETS } from "@/lib/dashboards-v3/rules";
import { lastEdited } from "@/lib/dashboards-v3/templates";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { MAX_WIDGETS_NOTE } from "@/lib/dashboards-v3/widgets";
import { cn } from "@/lib/utils";
import { Dialog } from "./ui/Dialog";
import { RowMenu, type MenuItem } from "./ui/RowMenu";

const RECENT = 5;

/** Why these widgets don't fit on a dashboard, or null when they do. */
export function roomBlocked(d: Dashboard, adding: number): string | null {
  const room = MAX_WIDGETS - d.widgets.length;
  if (room <= 0) return MAX_WIDGETS_NOTE;
  return room < adding ? `Only room for ${room} more widget${room === 1 ? "" : "s"}` : null;
}

/**
 * Add to dashboard ▾: your five most recently edited dashboards, then "All
 * my dashboards…" (every one of yours, in a dialog). Never a template or
 * someone else's; a dashboard without room says so.
 */
export function AddToDashboard({
  own, adding, onAdd, disabled,
}: {
  own: Dashboard[];
  /** How many widgets would be added. */
  adding: number;
  onAdd: (d: Dashboard) => void;
  disabled?: string | null;
}) {
  const [all, setAll] = useState(false);
  const recent = [...own].sort((a, b) => lastEdited(b).localeCompare(lastEdited(a))).slice(0, RECENT);
  const items: MenuItem[] = [
    ...recent.map((d) => ({ label: d.name, icon: LayoutDashboard, blocked: disabled ?? roomBlocked(d, adding), onSelect: () => onAdd(d) })),
    { label: "All my dashboards…", icon: LayoutDashboard, blocked: disabled ?? (own.length === 0 ? "You don’t have a dashboard of your own yet" : null), onSelect: () => setAll(true) },
  ];
  return (
    <>
      <RowMenu
        label="Add to dashboard"
        items={items}
        trigger={<>Add to dashboard <ChevronDown className="h-4 w-4" aria-hidden /></>}
        triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
      />
      {all && <AllDashboardsDialog own={own} adding={adding} onClose={() => setAll(false)} onAdd={(d) => { setAll(false); onAdd(d); }} />}
    </>
  );
}

function AllDashboardsDialog({ own, adding, onClose, onAdd }: { own: Dashboard[]; adding: number; onClose: () => void; onAdd: (d: Dashboard) => void }) {
  const sorted = [...own].sort((a, b) => a.name.localeCompare(b.name));
  const [chosen, setChosen] = useState<string | null>(sorted.find((d) => !roomBlocked(d, adding))?.id ?? null);
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
          const why = roomBlocked(d, adding);
          return (
            <label key={d.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm", why ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-800 hover:bg-slate-50")} title={why ?? undefined}>
              <input type="radio" name="add-to-dashboard" disabled={!!why} checked={chosen === d.id} onChange={() => setChosen(d.id)} className="h-4 w-4 accent-[#003B49]" />
              <span className="flex-1 truncate">{d.name}</span>
              <span className="text-xs text-slate-500">{why ? "No room" : `${d.widgets.length} widget${d.widgets.length === 1 ? "" : "s"}`}</span>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}

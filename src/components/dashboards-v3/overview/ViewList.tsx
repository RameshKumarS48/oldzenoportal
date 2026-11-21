"use client";

import { LayoutGrid, LayoutTemplate, Star, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OverviewView } from "@/store/dashboards-v3";

export const VIEWS: { id: OverviewView; label: string; icon: LucideIcon }[] = [
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "mine", label: "Your dashboards", icon: User },
  { id: "shared", label: "Shared with you", icon: Users },
  { id: "templates", label: "Zeno templates", icon: LayoutTemplate },
  { id: "all", label: "All", icon: LayoutGrid },
];

/** The overview's left list: each view with how many dashboards it holds. */
export function ViewList({
  active,
  counts,
  onChange,
}: {
  active: OverviewView;
  counts: Record<OverviewView, number>;
  onChange: (view: OverviewView) => void;
}) {
  return (
    <nav aria-label="Dashboard views" className="space-y-0.5">
      {VIEWS.map(({ id, label, icon: Icon }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
              on ? "bg-white font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", on ? "text-zeno-teal" : "text-slate-400")} />
            <span className="flex-1 truncate">{label}</span>
            <span className={cn("tabular-nums text-xs", on ? "text-slate-600" : "text-slate-500")}>{counts[id]}</span>
          </button>
        );
      })}
    </nav>
  );
}

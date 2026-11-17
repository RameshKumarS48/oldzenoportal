"use client";

import Link from "next/link";
import { ArrowUpRight, Copy, CopyPlus, Home, Lock, Pencil, Share2, Star, Trash2, Users, Globe } from "lucide-react";
import { fmtLastViewed } from "@/lib/dashboards-v3/format";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { isOwn } from "@/store/dashboards-v3";
import { CategoryChip } from "../ui/CategoryChip";
import { RowMenu, type MenuItem } from "../ui/RowMenu";

export interface RowActions {
  open: (d: Dashboard) => void;
  rename: (d: Dashboard) => void;
  duplicate: (d: Dashboard) => void;
  customise: (d: Dashboard) => void;
  share: (d: Dashboard) => void;
  toggleDefault: (d: Dashboard) => void;
  remove: (d: Dashboard) => void;
}

const TH = "sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_var(--color-slate-200)] px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap text-left";
const TD = "px-3 py-3 text-slate-700 align-top";

export function dashboardHref(d: Dashboard): string {
  return `/dashboards-v3/${d.id}`;
}

function menuItems(d: Dashboard, isDefault: boolean, a: RowActions): MenuItem[] {
  const open: MenuItem = { label: "Open", icon: ArrowUpRight, onSelect: () => a.open(d) };
  if (d.isTemplate) return [open, { label: "Duplicate to customise", icon: CopyPlus, onSelect: () => a.customise(d) }];
  const setDefault: MenuItem = { label: isDefault ? "Remove as default" : "Set as default", icon: Home, onSelect: () => a.toggleDefault(d) };
  const duplicate: MenuItem = { label: "Duplicate", icon: Copy, onSelect: () => a.duplicate(d) };
  if (!isOwn(d)) return [open, duplicate, setDefault];
  return [
    open,
    { label: "Rename", icon: Pencil, onSelect: () => a.rename(d) },
    duplicate,
    { label: "Share", icon: Share2, onSelect: () => a.share(d) },
    setDefault,
    { label: "Delete", icon: Trash2, onSelect: () => a.remove(d), danger: true },
  ];
}

function Visibility({ d }: { d: Dashboard }) {
  if (d.isTemplate) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
        <Globe className="h-3.5 w-3.5 text-slate-400" /> Everyone
      </span>
    );
  }
  const team = d.visibility === "team";
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
        {team ? <Users className="h-3.5 w-3.5 text-slate-400" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
        {team ? "Team" : "Only you"}
      </span>
      {d.owner && <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">Shared by {d.owner}</p>}
    </div>
  );
}

/** The overview's table of dashboards. Rows open on click; every action is also in the ⋯ menu. */
export function DashboardsTable({
  rows,
  favorites,
  defaultId,
  now,
  onToggleFavorite,
  actions,
}: {
  rows: Dashboard[];
  favorites: string[];
  defaultId: string | null;
  now: number;
  onToggleFavorite: (id: string) => void;
  actions: RowActions;
}) {
  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col className="w-12" />
        <col />
        <col className="w-[180px]" />
        <col className="w-[150px]" />
        <col className="w-[90px]" />
        <col className="w-[130px]" />
        <col className="w-14" />
      </colgroup>
      <thead>
        <tr>
          <th className={TH}><span className="sr-only">Favorite</span></th>
          <th className={TH}>Name</th>
          <th className={TH}>Category</th>
          <th className={TH}>Visibility</th>
          <th className={cn(TH, "text-right")}>Widgets</th>
          <th className={TH}>Last viewed</th>
          <th className={TH}><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => {
          const fav = favorites.includes(d.id);
          const isDefault = d.id === defaultId;
          return (
            <tr
              key={d.id}
              onClick={() => actions.open(d)}
              className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
            >
              <td className={cn(TD, "pr-0")}>
                <button
                  type="button"
                  aria-pressed={fav}
                  aria-label={fav ? `Remove ${d.name} from favorites` : `Add ${d.name} to favorites`}
                  title={fav ? "Remove from favorites" : "Add to favorites"}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(d.id); }}
                  className="-m-1 rounded p-1 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                >
                  <Star className={cn("h-4 w-4", fav ? "fill-amber-600 text-amber-600" : "text-slate-400")} />
                </button>
              </td>
              <td className={TD}>
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={dashboardHref(d)}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate font-semibold text-slate-800 hover:underline focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                  >
                    {d.name}
                  </Link>
                  {isDefault && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                      <Home className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                {d.widgets.length === 0 ? (
                  <p className="mt-0.5 truncate text-xs italic text-slate-500">No widgets yet</p>
                ) : (
                  d.description && <p className="mt-0.5 truncate text-xs text-slate-500">{d.description}</p>
                )}
              </td>
              <td className={TD}><CategoryChip category={d.category} /></td>
              <td className={TD}><Visibility d={d} /></td>
              <td className={cn(TD, "text-right tabular-nums")}>{d.widgets.length}</td>
              <td className={cn(TD, "whitespace-nowrap text-slate-600")}>{fmtLastViewed(d.lastViewedAt, now)}</td>
              <td className={cn(TD, "py-2 text-right")}>
                <RowMenu label={`Actions for ${d.name}`} items={menuItems(d, isDefault, actions)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

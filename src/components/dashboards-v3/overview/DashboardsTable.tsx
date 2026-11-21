"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Copy, CopyPlus, Home, Link2, Lock, Pencil, Share2, Star, Trash2, Users, Globe } from "lucide-react";
import { fmtLastViewed } from "@/lib/dashboards-v3/format";
import type { Dashboard } from "@/lib/dashboards-v3/types";
import { cn } from "@/lib/utils";
import { isOwn, type OverviewSort, type SortKey } from "@/store/dashboards-v3";
import { CategoryChip } from "../ui/CategoryChip";
import { RowMenu, type MenuItem } from "../ui/RowMenu";

export interface RowActions {
  open: (d: Dashboard) => void;
  rename: (d: Dashboard) => void;
  duplicate: (d: Dashboard) => void;
  customise: (d: Dashboard) => void;
  copyLink: (d: Dashboard) => void;
  share: (d: Dashboard) => void;
  toggleDefault: (d: Dashboard) => void;
  remove: (d: Dashboard) => void;
}

const TH = "sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_var(--color-slate-200)] px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap text-left";
const TD = "px-3 py-3 text-slate-700 align-top";

export function dashboardHref(d: Dashboard): string {
  return `/dashboards-v3/${d.id}`;
}

export function menuItems(d: Dashboard, isDefault: boolean, a: RowActions): MenuItem[] {
  const open: MenuItem = { label: "Open", icon: ArrowUpRight, onSelect: () => a.open(d) };
  const setDefault: MenuItem = { label: isDefault ? "Remove as default" : "Set as default", icon: Home, onSelect: () => a.toggleDefault(d) };
  // Templates are read-only: open, copy, link or make default, nothing that changes them.
  if (d.isTemplate) {
    return [
      open,
      { label: "Duplicate to customise", icon: CopyPlus, onSelect: () => a.customise(d) },
      { label: "Copy link", icon: Link2, onSelect: () => a.copyLink(d) },
      setDefault,
    ];
  }
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

/**
 * A sortable column header: the th carries aria-sort, the button inside does
 * the sorting. Only the active column shows its arrow; the others show a
 * faint one on hover or focus, so it's clear they can be sorted.
 */
function SortHeader({ column, label, sort, onSort, right }: { column: SortKey; label: string; sort: OverviewSort; onSort: (k: SortKey) => void; right: boolean }) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn(TH, right && "text-right")} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "group -mx-1 inline-flex items-center gap-1 rounded px-1 font-semibold transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
          active && "text-slate-700"
        )}
      >
        {label}
        <Icon
          aria-hidden
          className={cn("h-3.5 w-3.5", active ? "text-slate-600" : "text-slate-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")}
        />
      </button>
    </th>
  );
}

/** The overview's table of dashboards. Rows open on click; every action is also in the ⋯ menu. */
export function DashboardsTable({
  rows,
  favorites,
  defaultId,
  now,
  onToggleFavorite,
  sort,
  onSort,
  actions,
  templateNames = {},
}: {
  /** Template names by id, so a copy without a description says which template it's based on. */
  templateNames?: Record<string, string>;
  rows: Dashboard[];
  favorites: string[];
  defaultId: string | null;
  now: number;
  onToggleFavorite: (id: string) => void;
  sort: OverviewSort;
  onSort: (key: SortKey) => void;
  actions: RowActions;
}) {
  const head = (key: SortKey, label: string, right = false) => (
    <SortHeader key={key} column={key} label={label} sort={sort} onSort={onSort} right={right} />
  );
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
          {head("name", "Name")}
          {head("category", "Category")}
          {head("visibility", "Visibility")}
          {head("widgets", "Widgets", true)}
          {head("lastViewed", "Last viewed")}
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
                  (d.description || (d.basedOnTemplateId && templateNames[d.basedOnTemplateId])) && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">{d.description || `Based on ${templateNames[d.basedOnTemplateId!]}`}</p>
                  )
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

"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { CopyButton } from "@/components/ui/CopyButton";
import { PER_PAGE_OPTIONS } from "./per-page";
import type { Sort, SortKey } from "./filters";
import { Asset, Dash, LastSeen, Location, Soc } from "./cells";

/**
 * Each column's width, in px including px-3 padding: its widest content (header
 * with sort icon, or value) measured in the browser, plus the padding. Nothing
 * wraps at this width, and below their sum (852px) the table scrolls sideways.
 * Asset is sized for a 17-character VIN after its 14px icon and 6px gap, at the
 * Serial column's 7.25px per monospace character.
 */
const COLUMNS: { label: string; width: number; sortKey?: SortKey }[] = [
  { label: "Battery Serial No.", width: 140 },
  { label: "IMEI", width: 132 },
  { label: "Last Seen (UTC)", width: 132, sortKey: "lastSeen" },
  { label: "SOC %", width: 80, sortKey: "soc" },
  { label: "Asset", width: 168 },
  { label: "Last Known Location", width: 200 },
];
const MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

/**
 * The table fills the row: the width left over after every column's content is
 * shared equally between the columns, so the space between one column's
 * content and the next is the same everywhere. 100cqw is the scroll area's
 * width (a size container); the share never goes below zero.
 */
const colWidth = (min: number) =>
  `calc(${min}px + max(0px, (100cqw - ${MIN_WIDTH}px) / ${COLUMNS.length}))`;

/** Asset Tracking's sort icon: neutral until sorted, then the direction in brand red. */
function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return direction === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-zeno-red" />
    : <ArrowDown className="w-3 h-3 ml-1 text-zeno-red" />;
}

/**
 * The batteries list: Asset Tracking's table card, rows and pagination, with
 * the dev portal's five columns plus Asset. A row opens that battery's detail page, by
 * click or by Enter once focused; its copy buttons and map link do their own
 * thing only.
 */
export function BatteryTable({
  rows,
  loading,
  sort,
  onSort,
  filteredColumn,
  page,
  perPage,
  onPage,
  onPerPage,
  onOpen,
}: {
  rows: BatteryRecord[];
  /** Before the rows exist (the server render): an empty table, not "no match". */
  loading: boolean;
  sort: Sort;
  onSort: (column: SortKey) => void;
  /** A column a filter is narrowing; its header takes the selected style. */
  filteredColumn: SortKey | null;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
  onOpen: (serialNo: string) => void;
}) {
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white border border-slate-200 rounded-xl">
      <div className="@container overflow-auto flex-1">
        <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: MIN_WIDTH }}>
          <colgroup>
            {COLUMNS.map(({ label, width }) => (
              <col key={label} style={{ width: colWidth(width) }} />
            ))}
          </colgroup>
          {/* Sticky header. With border-collapse a cell's border stays behind when it sticks, so the
              divider is an inset 1px shadow in the same slate-200, which moves with the cell. */}
          <thead>
            <tr>
              {COLUMNS.map(({ label, sortKey }) => (
                <th
                  key={label}
                  aria-sort={
                    !sortKey ? undefined
                    : sort?.column !== sortKey ? "none"
                    : sort.direction === "asc" ? "ascending" : "descending"
                  }
                  className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_var(--color-slate-200)] px-3 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap text-left select-none"
                >
                  {sortKey ? (
                    <button
                      onClick={() => onSort(sortKey)}
                      className={cn(
                        "inline-flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40",
                        // The selected tint (the active Filters button, chips), as a pill on the opaque header:
                        // pulled out by its padding so the label stays in line with the values.
                        filteredColumn === sortKey
                          ? "-mx-1.5 -my-0.5 px-1.5 py-0.5 bg-zeno-teal/10 text-zeno-teal dark:bg-(--sidebar-text)/10 dark:text-(--sidebar-text)"
                          : "hover:text-slate-700"
                      )}
                    >
                      {label}
                      {filteredColumn === sortKey && <span className="sr-only"> (filtered)</span>}
                      <SortIcon active={sort?.column === sortKey} direction={sort?.direction} />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-16 text-slate-400 text-sm">
                  No batteries match the current search and filters.
                </td>
              </tr>
            )}
            {pageRows.map((b) => (
              <tr
                key={b.serialNo}
                tabIndex={0}
                aria-label={`Battery ${b.serialNo}, open details`}
                onClick={() => onOpen(b.serialNo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) onOpen(b.serialNo);
                }}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zeno-teal/40"
              >
                <td className="px-3 py-2.5 text-slate-700 font-mono text-xs whitespace-nowrap tabular-nums">
                  <CopyButton value={b.serialNo} label="battery serial number" />
                </td>
                <td className="px-3 py-2.5 text-slate-700 font-mono text-xs whitespace-nowrap tabular-nums">
                  {b.imei ? <CopyButton value={b.imei} label="IMEI" /> : <Dash />}
                </td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                  <LastSeen text={b.lastSeen} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Soc value={b.soc} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Asset asset={b.asset} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Location text={b.location} region={b.region} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        total={rows.length}
        page={page}
        perPage={perPage}
        onPage={onPage}
        onPerPage={onPerPage}
        perPageOptions={PER_PAGE_OPTIONS}
      />
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import type { BatteryRecord } from "@/lib/mock/battery-tracking";
import { Pagination } from "@/components/ui/Pagination";
import { CopyButton } from "@/components/ui/CopyButton";
import { PER_PAGE_OPTIONS } from "./per-page";
import type { Sort, SortKey } from "./filters";

const Dash = () => <span className="text-slate-300">–</span>;

/**
 * Each column's minimum, in px including px-3 padding: the wider of the header
 * and the longest value in Geist / Geist Mono, as Asset Tracking's are.
 */
const COLUMNS: { label: string; width: number; sortKey?: SortKey }[] = [
  { label: "Battery Serial No.", width: 144 },
  { label: "IMEI", width: 136 },
  // Sortable headers are 16px wider, for the sort icon.
  { label: "Last Seen (UTC)", width: 136, sortKey: "lastSeen" },
  // A 40px slot for "100%", the 8px gap and the 64px bar.
  { label: "SOC", width: 136, sortKey: "soc" },
  // The header is wider than the 72px latitude slot, comma, 80px longitude slot and icon.
  { label: "Last Known Location (lat, long)", width: 208 },
];
const MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

/**
 * Columns grow with the table, from their minimum at a 960px-wide table to
 * their minimum plus 32px (spacing 8) at 1440px, then stop. Measured against
 * the scroll area (a size container), so the sidebar's state counts. Whatever
 * is left goes to a blank column after the last.
 */
const GROW = 32;
const colWidth = (min: number) => `clamp(${min}px, calc(${min}px + (100cqw - 960px) / 15), ${min + GROW}px)`;

/** Asset Tracking's sort icon: neutral until sorted, then the direction in brand red. */
function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-300" />;
  return direction === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-zeno-red" />
    : <ArrowDown className="w-3 h-3 ml-1 text-zeno-red" />;
}

/** "15 Oct 2026 09:56", stacked: date on top, time below. Text without a time shows as it is. */
function LastSeen({ text }: { text: string }) {
  if (!text) return <Dash />;
  const date = text.slice(0, 11);
  const time = text.slice(12);
  const exact = time ? `${date}, ${time} UTC` : `${date} UTC`;
  return (
    <time title={exact} className="block tabular-nums">
      <span className="block">{date}</span>
      {time && <span className="block text-xs text-slate-400">{time} UTC</span>}
    </time>
  );
}

/** A coordinate as shown: the true minus sign (−), not the stored hyphen. */
const showCoord = (n: string) => n.trim().replace(/^-/, "\u2212");

/**
 * "lat, long" as a link to that point in Google Maps, the vehicle page's "Show
 * on Google Map" style. Latitude and longitude each sit right-aligned in a
 * fixed slot, sized for the widest valid value ("−90.00000" in 72px, "−180.00000" in 80px), so
 * the decimal points line up down the column whatever the sign. The link and a
 * copy of the text use the stored numbers, with their hyphens.
 */
function Location({ text }: { text: string }) {
  if (!text) return <Dash />;
  const [lat, long] = text.split(",");
  if (long === undefined) return <span className="text-slate-600 tabular-nums">{text}</span>;
  const q = text.replace(/\s+/g, "");

  // Copying from inside this one link gives the stored text, not the minus signs.
  function onCopy(e: React.ClipboardEvent<HTMLElement>) {
    const sel = window.getSelection();
    if (!sel || !e.currentTarget.contains(sel.anchorNode) || !e.currentTarget.contains(sel.focusNode)) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
  }

  return (
    <a
      href={`https://maps.google.com/?q=${encodeURIComponent(q)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${text}, open in Google Maps (new tab)`}
      onCopy={onCopy}
      className="inline-flex items-center text-zeno-teal hover:underline tabular-nums whitespace-nowrap rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
    >
      <span className="w-18 shrink-0 text-right">{showCoord(lat)}</span>
      <span>,</span>
      <span className="w-20 shrink-0 text-right">{showCoord(long)}</span>
      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" />
    </a>
  );
}

/**
 * "78%" left-aligned in a slot as wide as "100%", then the bar, so every bar
 * starts at the same x. The bar is the provisioning pages' track, a step
 * darker (slate-200) so it shows on white, with a slate-400 fill; the text
 * carries the value, so it's hidden from screen readers.
 */
function Soc({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">No data</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-slate-700 tabular-nums">{value}%</span>
      <span aria-hidden className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <span className="block h-full rounded-full bg-slate-400" style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

/** The batteries list: Asset Tracking's table card, rows and pagination, with the dev portal's five columns. */
export function BatteryTable({
  rows,
  loading,
  sort,
  onSort,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  rows: BatteryRecord[];
  /** Before the rows exist (the server render): an empty table, not "no match". */
  loading: boolean;
  sort: Sort;
  onSort: (column: SortKey) => void;
  page: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
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
            <col />
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
                      className="inline-flex items-center hover:text-slate-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
                    >
                      {label}
                      <SortIcon active={sort?.column === sortKey} direction={sort?.direction} />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
              <th aria-hidden className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_var(--color-slate-200)]" />
            </tr>
          </thead>
          <tbody>
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-16 text-slate-400 text-sm">
                  No batteries match the current search and filters.
                </td>
              </tr>
            )}
            {pageRows.map((b) => (
              <tr key={b.serialNo} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                  <Location text={b.location} />
                </td>
                <td aria-hidden />
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

"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * How Battery Tracking shows its values, shared by the table and the detail
 * card so both read the same.
 */

export const Dash = () => <span className="text-slate-300">–</span>;

/** "lat, long" split into its two stored numbers, or null if it isn't a pair. */
export function splitLocation(text: string): [string, string] | null {
  const [lat, long, extra] = text.split(",");
  if (long === undefined || extra !== undefined) return null;
  return [lat.trim(), long.trim()];
}

/** A coordinate as shown: the true minus sign (−), not the stored hyphen. */
export const showCoord = (n: string) => n.trim().replace(/^-/, "−");

/** Google Maps at a stored "lat, long". */
export const mapsUrl = (text: string) => `https://maps.google.com/?q=${encodeURIComponent(text.replace(/\s+/g, ""))}`;

/**
 * "15 Oct 2026 09:56", stacked: date on top, time below in muted text, and the
 * exact stored time on hover. Text without a time shows as it is.
 */
export function LastSeen({ text }: { text: string }) {
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

/**
 * "78%" left-aligned in a slot as wide as "100%", then the bar, so every bar
 * starts at the same x. The bar is the provisioning pages' track, a step
 * darker (slate-200) so it shows on white, with a slate-400 fill; the text
 * carries the value, so it's hidden from screen readers.
 */
export function Soc({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-slate-400", className)}>No data</span>;
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="w-10 shrink-0 text-slate-700 tabular-nums">{value}%</span>
      <span aria-hidden className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <span className="block h-full rounded-full bg-slate-400" style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

/**
 * The table's "lat, long" link to Google Maps, in the vehicle page's "Show on
 * Google Map" style. Latitude and longitude each sit right-aligned in a fixed
 * slot, sized for the widest valid value ("−90.00000" in 72px, "−180.00000" in
 * 80px), so the decimal points line up down the column whatever the sign. The
 * link and a copy of the text use the stored numbers, with their hyphens.
 *
 * It's inside a clickable row: its click and Enter open Maps only.
 */
export function Location({ text }: { text: string }) {
  if (!text) return <Dash />;
  const pair = splitLocation(text);
  if (!pair) return <span className="text-slate-600 tabular-nums">{text}</span>;
  const [lat, long] = pair;

  // Copying from inside this one link gives the stored text, not the minus signs.
  function onCopy(e: React.ClipboardEvent<HTMLElement>) {
    const sel = window.getSelection();
    if (!sel || !e.currentTarget.contains(sel.anchorNode) || !e.currentTarget.contains(sel.focusNode)) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
  }

  return (
    <a
      href={mapsUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${text}, open in Google Maps (new tab)`}
      onCopy={onCopy}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="inline-flex items-center text-zeno-teal hover:underline tabular-nums whitespace-nowrap rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
    >
      <span className="w-18 shrink-0 text-right">{showCoord(lat)}</span>
      <span>,</span>
      <span className="w-20 shrink-0 text-right">{showCoord(long)}</span>
      <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-1.5" />
    </a>
  );
}

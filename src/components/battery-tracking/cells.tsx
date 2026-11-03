"use client";

import { Bike, ExternalLink, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import type { BatteryAsset } from "@/lib/mock/battery-tracking";
import { CHARGE_DUE_DAYS, STATUS_LABELS, type BatteryStatus, type Provisioning } from "@/lib/mock/battery-provisioning";
import { slotLabel } from "@/lib/slot-label";

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
export const mapsUrl = (text: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text.replace(/\s+/g, ""))}`;

/**
 * "15 Oct 2026 09:56", stacked: date on top, time below in muted text, and the
 * exact stored time on hover. The zone is in the column header and the card's
 * label ("Last Seen (UTC)"), so only the hover text repeats it. Text without a
 * time shows as it is.
 */
export function LastSeen({ text }: { text: string }) {
  if (!text) return <Dash />;
  const date = text.slice(0, 11);
  const time = text.slice(12);
  const exact = time ? `${date}, ${time} UTC` : `${date} UTC`;
  return (
    <time title={exact} className="block tabular-nums">
      <span className="block">{date}</span>
      {time && <span className="block text-xs text-slate-400">{time}</span>}
    </time>
  );
}

/** Last Seen on one line, "27 Oct 2026 · 05:33", for the detail card; the exact stored time on hover. */
export function LastSeenLine({ text }: { text: string }) {
  if (!text) return <Dash />;
  const date = text.slice(0, 11);
  const time = text.slice(12);
  return (
    <time title={time ? `${date}, ${time} UTC` : `${date} UTC`} className="tabular-nums whitespace-nowrap">
      {time ? `${date} · ${time}` : date}
    </time>
  );
}

/**
 * SOC as a plain number ("78"); the "%" is in the column header and the card's
 * label ("SOC %"). It sits right-aligned in a slot as wide as "100" (26px, in
 * w-7), with tabular figures, so the digits line up down the column. No value
 * shows "No data" in muted text, starting where the slot starts.
 */
export function Soc({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-slate-400", className)}>No data</span>;
  return <span className={cn("inline-block w-7 text-right text-slate-700 tabular-nums", className)}>{value}</span>;
}

/**
 * The table's Last Known Location, two lines like Last Seen's so the row lines
 * up: the region with the external-link icon, then "−1.33069, 36.85595" under
 * it in smaller muted text. Both lines are one link to Google Maps, taking the
 * link colour and an underline on hover and focus; a copy of the text gives the
 * stored numbers, with their hyphens. No location shows "No location reported",
 * muted, with no link.
 *
 * It's inside a clickable row: the link's click and Enter open Maps only.
 */
export function Location({ text, region }: { text: string; region: string | null }) {
  if (!text.trim()) return <span className="text-slate-400">No location reported</span>;
  const pair = splitLocation(text);

  // Copying from inside this one link gives the stored text, not the minus signs.
  function onCopy(e: React.ClipboardEvent<HTMLElement>) {
    const sel = window.getSelection();
    if (!sel || !e.currentTarget.contains(sel.anchorNode) || !e.currentTarget.contains(sel.focusNode)) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", text);
  }

  const LINKED = "group-hover:text-zeno-teal group-hover:underline group-focus-visible:text-zeno-teal group-focus-visible:underline dark:group-hover:text-(--sidebar-text) dark:group-focus-visible:text-(--sidebar-text)";
  return (
    <a
      href={mapsUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in Google Maps"
      aria-label={`${region ?? "Unknown region"}, ${text}. Open in Google Maps`}
      onCopy={onCopy}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="group inline-block rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-zeno-teal/40"
    >
      <span className={cn("flex items-center gap-1.5 text-slate-700", LINKED)}>
        {region ?? "Unknown region"}
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </span>
      <span className={cn("block text-xs text-slate-400 tabular-nums whitespace-nowrap", LINKED)}>
        {pair ? `${showCoord(pair[0])}, ${showCoord(pair[1])}` : text}
      </span>
    </a>
  );
}

/**
 * Where the battery is: a station code and its slot ("BS0019 · S03", the
 * slot muted, labelled as Swap Audit labels slots) or a VIN, after a small station or vehicle icon, in the IDs'
 * monospace. The code or VIN has their copy button; the slot isn't copied. In neither,
 * the muted dash, with the reason on hover.
 */
export function Asset({ asset }: { asset: BatteryAsset | null }) {
  if (!asset) {
    return (
      <span title="Not in a vehicle or station" className="text-slate-300">
        <span aria-hidden>–</span>
        <span className="sr-only">Not in a vehicle or station</span>
      </span>
    );
  }
  const station = asset.type === "station";
  const Icon = station ? Zap : Bike;
  const value = station ? asset.code : asset.vin;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-700">
      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" role="img" aria-label={station ? "Station" : "Vehicle"} />
      <CopyButton value={value} label={station ? "station code" : "VIN"} />
      {station && <span className="text-slate-400">· {slotLabel(asset.slot)}</span>}
    </span>
  );
}

/**
 * Each provisioning state's pill colour, along the lifecycle: slate before
 * bring-up, sky and violet through storage, teal when ready to deploy, green
 * Active, red Quarantine, and muted stone once Retired.
 */
const STATUS_TONE: Record<BatteryStatus, string> = {
  pre_bringup: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  ready_1: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  storage: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  ready_2: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  quarantine: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  retired: "bg-stone-200 text-stone-600 dark:bg-stone-500/20 dark:text-stone-300",
};

/** "Register for Storage/charging" is long for a pill; the pill says "In storage", the title the PRD name. */
const SHORT_LABEL: Partial<Record<BatteryStatus, string>> = { storage: "In storage" };

const PILL = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap";

/** The battery's state as a coloured pill, with the PRD's full name on hover. */
export function StatusBadge({ status }: { status: BatteryStatus }) {
  return (
    <span title={STATUS_LABELS[status]} className={cn(PILL, STATUS_TONE[status])}>
      {SHORT_LABEL[status] ?? STATUS_LABELS[status]}
    </span>
  );
}

/** A flag beside the state: amber Repair in progress, orange Charge due. */
export function FlagPill({ flag }: { flag: "repair" | "charge" }) {
  return flag === "repair" ? (
    <span className={cn(PILL, "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300")}>Repair in progress</span>
  ) : (
    <span
      title={`More than ${CHARGE_DUE_DAYS} days since the last storage charge`}
      className={cn(PILL, "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300")}
    >
      Charge due
    </span>
  );
}

/** The state pill and any flags, wrapping onto a second line when narrow. */
export function StatusCell({ battery }: { battery: Pick<Provisioning, "status" | "repairInProgress" | "chargeDue"> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StatusBadge status={battery.status} />
      {battery.repairInProgress && <FlagPill flag="repair" />}
      {battery.chargeDue && <FlagPill flag="charge" />}
    </span>
  );
}

/**
 * A stored battery's two clocks, on Last Seen's two lines: "42 d in storage",
 * then "12 d since charge", amber when Charge due. Not in storage: the dash.
 */
export function StorageDays({ storage, chargeDue }: { storage: Provisioning["storage"]; chargeDue: boolean }) {
  if (storage?.daysInStorage == null || storage.daysSinceCharge == null) return <Dash />;
  return (
    <span className="block tabular-nums whitespace-nowrap">
      <span className="block text-slate-700">{storage.daysInStorage} d in storage</span>
      <span className={cn("block text-xs", chargeDue ? "text-amber-700 dark:text-amber-300 font-medium" : "text-slate-400")}>
        {storage.daysSinceCharge} d since charge
      </span>
    </span>
  );
}

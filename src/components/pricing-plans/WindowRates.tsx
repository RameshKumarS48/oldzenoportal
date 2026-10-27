import { BASE_LABEL, eatSecondOfDay, fmtRateWindow, inRateWindow, sortWindows, type SplitVersion } from "@/lib/pricing/windows";
import { cn } from "@/lib/utils";
import { baseBandId, WindowSwatch } from "./DayBandBar";

const NowTag = () => (
  <span className="px-1.5 py-0.5 rounded bg-zeno-teal text-[10px] font-semibold leading-none text-white">Now</span>
);

/**
 * A version's rates, one row per window in time order: the time slots in
 * their colours, and each rest-of-day stretch (white, tagged "Rest of the
 * day") with its own rates. With `now`, the row in force at that EAT time is
 * tinted, with an accent bar and a "Now" tag, so it never relies on colour
 * alone. Swatches and ids match `versionBands`, so `highlighted` and
 * `onHighlight` link a row to its band.
 */
export function WindowRates({
  split,
  now,
  highlighted,
  onHighlight,
}: {
  split: SplitVersion;
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const second = now ? eatSecondOfDay(now) : null;
  const { baseWindows, custom } = split;
  const slotColor = new Map(custom.map((w, i) => [w.start, i]));
  const isBase = new Set(baseWindows.map((w) => w.start));

  const row = (
    id: string,
    label: React.ReactNode,
    color: number | "base",
    rates: { slab1: number; slab2: number },
    live: boolean,
    note?: string
  ) => (
    <tr
      key={id}
      onMouseEnter={() => onHighlight?.(id)}
      onMouseLeave={() => onHighlight?.(null)}
      className={cn("transition-colors", highlighted === id && "bg-slate-50", live && "bg-zeno-teal/5")}
    >
      <td className={cn("py-2 pl-2 text-slate-600", live && "shadow-[inset_3px_0_0_var(--color-zeno-teal)]")}>
        <div className="flex items-center gap-2">
          <WindowSwatch color={color} />
          {label}
          {live && <NowTag />}
        </div>
        {note && <p className="pl-5 text-[11px] text-slate-400 tabular-nums">{note}</p>}
      </td>
      <td className="py-2 text-right tabular-nums font-semibold text-slate-800 align-top">{rates.slab1}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-700 align-top">{rates.slab2}</td>
    </tr>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <th className="py-1.5 pl-2 font-bold">Time (EAT)</th>
          <th className="py-1.5 text-right font-bold">Slab 1</th>
          <th className="py-1.5 pr-2 text-right font-bold">Slab 2</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sortWindows([...baseWindows, ...custom]).map((w) => {
          const base = isBase.has(w.start);
          const live = second !== null && inRateWindow(second, w);
          return row(
            base ? baseBandId(w) : w.start,
            <span className="tabular-nums whitespace-nowrap">{fmtRateWindow(w)}</span>,
            base ? "base" : slotColor.get(w.start)!,
            w,
            live,
            base ? BASE_LABEL : undefined
          );
        })}
      </tbody>
    </table>
  );
}

import { BASE_LABEL, coversText, eatSecondOfDay, fmtRateWindow, inRateWindow, type SplitVersion } from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { BASE_ID, WindowSwatch } from "./DayBandBar";

const NowTag = () => (
  <span className="px-1.5 py-0.5 rounded bg-zeno-teal text-[10px] font-semibold leading-none text-white">Now</span>
);

/**
 * A version's rates: Rest of the day first, with the hours it covers, then
 * the custom windows earliest first. With `now`, the row in force at that
 * EAT time is tinted, with an accent bar and a "Now" tag, so it never relies
 * on colour alone. Swatches match `versionBands`; `highlighted` and
 * `onHighlight` (BASE_ID, or a window's start) link a row to its bands.
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
  const inForce = (ws: RateWindow[]) => second !== null && ws.some((w) => inRateWindow(second, w));
  const { base, baseWindows, custom } = split;

  const row = (
    id: string,
    label: React.ReactNode,
    color: number | "base",
    rates: { slab1: number; slab2: number } | null,
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
      <td className="py-2 text-right tabular-nums font-semibold text-slate-800 align-top">{rates?.slab1 ?? "–"}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-700 align-top">{rates?.slab2 ?? "–"}</td>
    </tr>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <th className="py-1.5 pl-2 font-bold">Window (EAT)</th>
          <th className="py-1.5 text-right font-bold">Slab 1</th>
          <th className="py-1.5 pr-2 text-right font-bold">Slab 2</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {row(BASE_ID, <span className="text-slate-700">{BASE_LABEL}</span>, "base", base, inForce(baseWindows), coversText(custom))}
        {custom.map((w, i) =>
          row(w.start, <span className="tabular-nums whitespace-nowrap">{fmtRateWindow(w)}</span>, i, w, inForce([w]))
        )}
      </tbody>
    </table>
  );
}

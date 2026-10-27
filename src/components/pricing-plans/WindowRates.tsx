import { BASE_LABEL, coversText, eatSecondOfDay, fmtRateWindow, inRateWindow, type SplitVersion } from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";
import { cn } from "@/lib/utils";
import { BASE_ID, WindowSwatch } from "./DayBandBar";

const NowTag = () => <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">Now</span>;

/**
 * A version's rates: Rest of the day first, with the hours it covers, then
 * the custom windows earliest first. With `now`, the rates in force at that
 * EAT time are tagged. Swatches match `versionBands`; `highlighted` and
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

  const row = (id: string, label: React.ReactNode, color: number | "base", rates: { slab1: number; slab2: number } | null, live: boolean) => (
    <tr
      key={id}
      onMouseEnter={() => onHighlight?.(id)}
      onMouseLeave={() => onHighlight?.(null)}
      className={cn("transition-colors", highlighted === id && "bg-slate-50")}
    >
      <td className="py-2 text-slate-600">
        <div className="flex items-start">
          <WindowSwatch color={color} className="mr-2 mt-[3px]" />
          <div>
            {label}
            {live && <NowTag />}
          </div>
        </div>
      </td>
      <td className="py-2 text-right tabular-nums font-semibold text-slate-800 align-top">{rates?.slab1 ?? "–"}</td>
      <td className="py-2 text-right tabular-nums text-slate-700 align-top">{rates?.slab2 ?? "–"}</td>
    </tr>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <th className="py-1.5 font-bold">Window (EAT)</th>
          <th className="py-1.5 text-right font-bold">Slab 1</th>
          <th className="py-1.5 text-right font-bold">Slab 2</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {row(
          BASE_ID,
          <>
            <span className="text-slate-700">{BASE_LABEL}</span>
            <p className="text-[11px] text-slate-400 tabular-nums">{coversText(custom)}</p>
          </>,
          "base",
          base,
          inForce(baseWindows)
        )}
        {custom.map((w, i) =>
          row(w.start, <span className="tabular-nums whitespace-nowrap">{fmtRateWindow(w)}</span>, i, w, inForce([w]))
        )}
      </tbody>
    </table>
  );
}

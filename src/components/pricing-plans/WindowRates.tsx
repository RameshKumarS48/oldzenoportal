import { eatSecondOfDay, fmtRateWindow, inRateWindow } from "@/lib/pricing/windows";
import { cn } from "@/lib/utils";
import { WindowSwatch, type BandItem } from "./DayBandBar";

const NowTag = () => (
  <span className="px-1.5 py-0.5 rounded bg-zeno-teal text-[10px] font-semibold leading-none text-white">Now</span>
);

/**
 * A version's rates, one row per band in time order, each with the swatch
 * its band has on the day bar (grey only for the Default Rate). With `now`,
 * the row in force at that EAT time is tinted, with an accent bar and a
 * "Now" tag, so it never relies on colour alone. Ids match the bar's, so
 * `highlighted` and `onHighlight` link a row to its band.
 */
export function WindowRates({
  bands,
  now,
  highlighted,
  onHighlight,
}: {
  bands: BandItem[];
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const second = now ? eatSecondOfDay(now) : null;

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
        {bands.map(({ id, window: w, color }) => {
          const live = second !== null && inRateWindow(second, w);
          return (
            <tr
              key={id}
              onMouseEnter={() => onHighlight?.(id)}
              onMouseLeave={() => onHighlight?.(null)}
              className={cn("transition-colors", highlighted === id && "bg-slate-50", live && "bg-zeno-teal/5")}
            >
              <td className={cn("py-2 pl-2 text-slate-600", live && "shadow-[inset_3px_0_0_var(--color-zeno-teal)]")}>
                <div className="flex items-center gap-2">
                  <WindowSwatch color={color} />
                  <span className="tabular-nums whitespace-nowrap">{fmtRateWindow(w)}</span>
                  {live && <NowTag />}
                </div>
              </td>
              <td className="py-2 text-right tabular-nums font-semibold text-slate-800 align-top">{w.slab1}</td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-700 align-top">{w.slab2}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

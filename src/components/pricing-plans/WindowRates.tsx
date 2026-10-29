import { fmtRateWindow } from "@/lib/pricing/windows";
import { cn } from "@/lib/utils";
import { WindowSwatch, type BandItem } from "./DayBandBar";

/**
 * A version's rates, one row per band in time order, each with the swatch
 * its band has on the day bar (grey only for the Default Rate). Ids match
 * the bar's, so `highlighted` and `onHighlight` link a row to its band.
 */
export function WindowRates({
  bands,
  highlighted,
  onHighlight,
}: {
  bands: BandItem[];
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
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
        {bands.map(({ id, window: w, color }) => (
          <tr
            key={id}
            onMouseEnter={() => onHighlight?.(id)}
            onMouseLeave={() => onHighlight?.(null)}
            className={cn("transition-colors", highlighted === id && "bg-slate-50")}
          >
            <td className="py-2 pl-2 text-slate-600">
              <div className="flex items-center gap-2">
                <WindowSwatch color={color} />
                <span className="tabular-nums whitespace-nowrap">{fmtRateWindow(w)}</span>
              </div>
            </td>
            <td className="py-2 text-right tabular-nums font-semibold text-slate-800 align-top">{w.slab1}</td>
            <td className="py-2 pr-2 text-right tabular-nums text-slate-700 align-top">{w.slab2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

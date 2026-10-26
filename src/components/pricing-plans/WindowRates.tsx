import { inRateWindow, eatSecondOfDay, fmtRateWindow, sortWindows } from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * A version's windows and their two slab rates, earliest first. With `now`,
 * the window in force at that EAT time is tagged.
 */
export function WindowRates({ windows, now }: { windows: RateWindow[]; now?: string }) {
  const second = now ? eatSecondOfDay(now) : null;
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
        {sortWindows(windows).map((w) => (
          <tr key={w.start}>
            <td className="py-2 tabular-nums text-slate-600 whitespace-nowrap">
              {fmtRateWindow(w)}
              {second !== null && inRateWindow(second, w) && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">Now</span>
              )}
            </td>
            <td className="py-2 text-right tabular-nums font-semibold text-slate-800">{w.slab1}</td>
            <td className="py-2 text-right tabular-nums text-slate-700">{w.slab2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

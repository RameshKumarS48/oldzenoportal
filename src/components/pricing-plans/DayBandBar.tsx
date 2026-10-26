import { cn } from "@/lib/utils";
import { DAY_SECONDS, eatSecondOfDay, fmtRateWindow, parseHHmmss, sortWindows } from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";

/** Light to dark by slab 1 rank: the cheapest window is the lightest. */
const SHADES = [
  "bg-teal-100 text-teal-900",
  "bg-teal-200 text-teal-900",
  "bg-teal-300 text-teal-900",
  "bg-teal-500 text-white",
  "bg-teal-600 text-white",
  "bg-teal-700 text-white",
];

/** Labels only fit in bands at least this share of the day (about 2.5 h). */
const LABEL_MIN = 0.1;

/**
 * The day as a 24 h strip, one band per time window, shaded by price and
 * labelled with its slab 1 / slab 2 rates where they fit. With `now`, a marker
 * shows the current EAT time.
 */
export function DayBandBar({
  windows,
  now,
  className,
}: {
  windows: RateWindow[];
  now?: string;
  className?: string;
}) {
  const rates = Array.from(new Set(windows.map((w) => w.slab1))).sort((a, b) => a - b);
  const shade = (w: RateWindow) =>
    SHADES[Math.round((rates.indexOf(w.slab1) / Math.max(rates.length - 1, 1)) * (SHADES.length - 1))];

  // Both ends are inclusive, so a band runs to the second after its end. A
  // window that wraps midnight draws as two pieces.
  const bands = sortWindows(windows).flatMap((w) => {
    const s = parseHHmmss(w.start) / DAY_SECONDS;
    const e = (parseHHmmss(w.end) + 1) / DAY_SECONDS;
    const pieces: [number, number][] = s < e ? [[s, e]] : [[s, 1], [0, e]].filter(([a, b]) => b > a) as [number, number][];
    return pieces.map(([a, b]) => ({ w, a, b }));
  });
  const marker = now ? eatSecondOfDay(now) / DAY_SECONDS : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative h-7 rounded-md bg-slate-200 overflow-hidden">
        {bands.map(({ w, a, b }) => (
          <div
            key={`${w.start}-${a}`}
            title={`${fmtRateWindow(w)} · ${w.slab1} / ${w.slab2} KES/kWh`}
            className={cn(
              "absolute inset-y-0 flex items-center justify-center border-r border-white/70 text-[10px] font-semibold tabular-nums",
              shade(w)
            )}
            style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
          >
            {b - a >= LABEL_MIN && `${w.slab1}/${w.slab2}`}
          </div>
        ))}
        {marker !== null && (
          <div
            className="absolute -inset-y-px w-0.5 bg-zeno-red"
            style={{ left: `calc(${marker * 100}% - 1px)` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  );
}

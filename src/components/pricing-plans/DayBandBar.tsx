import { cn } from "@/lib/utils";
import { parseHHmm } from "@/lib/pricing/engine";
import { fmtRate, fmtWindow } from "@/lib/pricing/format";

/** The day as a 24 h strip, with the custom window shaded over the standard rate. */
export function DayBandBar({
  standardRate,
  customRate,
  start,
  end,
  className,
}: {
  standardRate: number;
  customRate: number;
  start: string;
  end: string;
  className?: string;
}) {
  const s = parseHHmm(start) / 1440;
  const e = parseHHmm(end) / 1440;
  // A window that wraps midnight draws as two pieces.
  const segments: [number, number][] = s === e ? [] : s < e ? [[s, e]] : [[s, 1], [0, e]];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative h-7 rounded-md bg-slate-200 overflow-hidden">
        {segments.map(([a, b]) => (
          <div
            key={a}
            className="absolute inset-y-0 bg-teal-500/80"
            style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
          />
        ))}
        {[0.25, 0.5, 0.75].map((x) => (
          <div key={x} className="absolute inset-y-0 w-px bg-white/60" style={{ left: `${x * 100}%` }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Standard · {fmtRate(standardRate)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/80" /> Custom window {fmtWindow(start, end)} · {fmtRate(customRate)}
        </span>
      </div>
    </div>
  );
}

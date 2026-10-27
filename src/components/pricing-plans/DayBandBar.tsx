"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BASE_LABEL,
  DAY_SECONDS,
  eatSecondOfDay,
  fmtHHmmss,
  fmtRateWindow,
  parseHHmmss,
  windowBoundary,
  type SplitVersion,
} from "@/lib/pricing/windows";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * One colour per custom window: Tailwind teal 800, 300, 600, 200, 700, 400.
 * The order alternates dark and light so neighbours (and the last against the
 * first, around midnight) stay easy to tell apart.
 */
export const WINDOW_COLORS = ["#115e59", "#5eead4", "#0d9488", "#99f6e4", "#0f766e", "#2dd4bf"];

/**
 * The rest-of-day hours are white with a Tailwind slate 500 edge: 4.8:1
 * against white, so the band and its swatch stay visible on a white card.
 */
const BASE_EDGE = "#64748b";
/** A highlighted rest-of-day band: slate 700, as a white ring can't show on white. */
const BASE_EDGE_ON = "#334155";

/** The id every rest-of-day band shares, so they highlight together with their row. */
export const BASE_ID = "base";

/** A custom window's colour by index, or white for the rest of the day. */
const colorOf = (color: number | "base") => (color === "base" ? "#ffffff" : WINDOW_COLORS[color % WINDOW_COLORS.length]);

/** The small square that ties a row to its band. */
export function WindowSwatch({ color, className }: { color: number | "base"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-3 h-3 shrink-0 rounded-sm", className)}
      style={{ backgroundColor: colorOf(color), boxShadow: color === "base" ? `inset 0 0 0 1px ${BASE_EDGE}` : undefined }}
    />
  );
}

export interface BandItem {
  /** Stable across edits (a form row's key), so a moving boundary animates. BASE_ID for the rest of the day. */
  id: string;
  window: RateWindow;
  color: number | "base";
}

/** A saved version's bands: white rest-of-day hours, then the custom windows coloured in time order. */
export function versionBands({ baseWindows, custom }: Pick<SplitVersion, "baseWindows" | "custom">): BandItem[] {
  return [
    ...baseWindows.map((w) => ({ id: BASE_ID, window: w, color: "base" as const })),
    ...custom.map((w, i) => ({ id: w.start, window: w, color: i })),
  ];
}

/** Rough width of a boundary label ("16:00:00") at 10px, with breathing room. */
const LABEL_PX = 52;
/** Rough half-width of the "Now · 14:05:00" label, to keep it inside the bar. */
const NOW_HALF_PX = 42;

/** A boundary as its label: a start, "16:00:00", or the day's inclusive end, "23:59:59". */
const boundaryLabel = (at: number) => fmtHHmmss(at >= DAY_SECONDS ? DAY_SECONDS - 1 : at);

const rate = (n: number) => (Number.isFinite(n) ? String(n) : "–");

/**
 * The day as a 24 h strip: one band per window, no text inside; the rest of
 * the day is white with a dark edge and each custom window has its colour.
 * A window that crosses midnight is two bands, one at each end. Under it,
 * the boundary times sit at their boundaries; where two would overlap, a real
 * boundary beats the day's ends, then the earlier one wins.
 *
 * Hovering or focusing a band shows "17:00:00–19:59:59 · 110 / 90" (or
 * "Rest of the day · 90 / 70") and reports its id through `onHighlight`;
 * `highlighted` (an id) outlines it. `now` marks the current EAT time, with
 * "Now · 14:05:00" above the marker.
 */
export function DayBandBar({
  items,
  now,
  highlighted,
  onHighlight,
  className,
}: {
  items: BandItem[];
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ text: string; color: BandItem["color"]; x: number; y: number } | null>(null);

  // Labels depend on the bar's real width, which changes with the modal or page.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Both ends are inclusive, so a band runs to the second after its end.
  // Pieces are keyed by id and side, so a moving edge slides instead of jumping.
  const bands = items.flatMap((item) => {
    const s = parseHHmmss(item.window.start) / DAY_SECONDS;
    const e = windowBoundary(item.window) / DAY_SECONDS;
    const pieces: { side: string; a: number; b: number }[] =
      s < e ? [{ side: "main", a: s, b: e }] : [{ side: "late", a: s, b: 1 }, { side: "early", a: 0, b: e }];
    const live = pieces.filter((p) => p.b > p.a);
    const main = live.reduce((x, y) => (y.b - y.a > x.b - x.a ? y : x));
    return live.map((p) => ({ ...item, ...p, focusable: p === main }));
  });

  const labels = boundaryLabels(items.map((i) => parseHHmmss(i.window.start)), width);
  const marker = now ? eatSecondOfDay(now) / DAY_SECONDS : null;

  function show(item: BandItem, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setTip({ text: tipText(item), color: item.color, x: r.left + r.width / 2, y: r.top });
    onHighlight?.(item.id);
  }

  function hide() {
    setTip(null);
    onHighlight?.(null);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {marker !== null && (
        <div className="relative h-4 text-[10px] font-semibold text-slate-700 tabular-nums">
          {width > 0 && (
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
              style={{ left: Math.min(Math.max(marker * width, NOW_HALF_PX), width - NOW_HALF_PX) }}
            >
              Now · {fmtHHmmss(eatSecondOfDay(now!))}
            </span>
          )}
        </div>
      )}
      <div ref={barRef} className="relative h-6 rounded-md bg-slate-200 overflow-hidden">
        {bands.map((band) => {
          const on = highlighted === band.id;
          const base = band.color === "base";
          return (
            <div
              key={base ? `${band.id}-${band.window.start}-${band.side}` : `${band.id}-${band.side}`}
              role={band.focusable ? "img" : undefined}
              tabIndex={band.focusable ? 0 : undefined}
              aria-label={band.focusable ? tipText(band) : undefined}
              aria-hidden={band.focusable ? undefined : true}
              onMouseEnter={(e) => show(band, e.currentTarget)}
              onMouseLeave={hide}
              onFocus={(e) => show(band, e.currentTarget)}
              onBlur={hide}
              className={cn(
                "absolute inset-y-0 transition-[left,width,opacity] duration-300 ease-out focus:outline-none",
                base ? "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-700" : "border-r border-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white",
                highlighted && !on && "opacity-40",
                on && !base && "ring-2 ring-inset ring-white"
              )}
              style={{
                left: `${band.a * 100}%`,
                width: `${(band.b - band.a) * 100}%`,
                backgroundColor: colorOf(band.color),
                boxShadow: base ? `inset 0 0 0 ${on ? 2 : 1}px ${on ? BASE_EDGE_ON : BASE_EDGE}` : undefined,
              }}
            />
          );
        })}
        {marker !== null && (
          <div
            className="absolute -inset-y-px z-20 w-0.5 -translate-x-1/2 bg-zeno-red pointer-events-none"
            style={{ left: `${marker * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="relative h-4 text-[10px] text-slate-400 tabular-nums" aria-hidden="true">
        {labels.map((l) => (
          <span
            key={l.at}
            className={cn("absolute top-0 whitespace-nowrap", l.at === 0 ? "left-0" : l.at === DAY_SECONDS ? "right-0" : "-translate-x-1/2")}
            style={l.at === 0 || l.at === DAY_SECONDS ? undefined : { left: `${(l.at / DAY_SECONDS) * 100}%` }}
          >
            {boundaryLabel(l.at)}
          </span>
        ))}
      </div>

      {tip && (
        <span
          role="tooltip"
          className="fixed z-[70] pointer-events-none -translate-x-1/2 -translate-y-full -mt-2 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap tabular-nums"
          style={{ left: tip.x, top: tip.y }}
        >
          <WindowSwatch color={tip.color} />
          {tip.text}
        </span>
      )}
    </div>
  );
}

function tipText({ window: w, color }: BandItem): string {
  return `${color === "base" ? BASE_LABEL : fmtRateWindow(w)} · ${rate(w.slab1)} / ${rate(w.slab2)}`;
}

/**
 * The boundary labels that fit at `width` px. Candidates are every window
 * start plus the day's ends (00:00:00, 23:59:59); a start at midnight makes both
 * ends real boundaries. Real boundaries are placed first, then the ends,
 * earliest first within each, skipping any that would overlap one already placed.
 */
function boundaryLabels(starts: number[], width: number): { at: number }[] {
  if (width <= 0) return [];
  const real = new Set(starts.map((s) => s % DAY_SECONDS));
  if (real.has(0)) real.add(DAY_SECONDS);
  const candidates = [...new Set([0, DAY_SECONDS, ...real])]
    .map((at) => ({ at, real: real.has(at) }))
    .sort((x, y) => Number(y.real) - Number(x.real) || x.at - y.at);

  // Each label's span in px: the ends sit flush with the bar's edges, the rest are centred.
  const span = (at: number): [number, number] => {
    const x = (at / DAY_SECONDS) * width;
    if (at === 0) return [0, LABEL_PX];
    if (at === DAY_SECONDS) return [width - LABEL_PX, width];
    return [x - LABEL_PX / 2, x + LABEL_PX / 2];
  };
  const placed: { at: number; s: [number, number] }[] = [];
  for (const c of candidates) {
    const s = span(c.at);
    if (placed.every((p) => s[1] <= p.s[0] || s[0] >= p.s[1])) placed.push({ at: c.at, s });
  }
  return placed.map(({ at }) => ({ at })).sort((x, y) => x.at - y.at);
}

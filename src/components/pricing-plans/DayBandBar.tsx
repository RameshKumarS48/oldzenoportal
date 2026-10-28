"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_SECONDS,
  eatSecondOfDay,
  fmtHHmm,
  fmtRateWindowHHmm,
  parseHHmmss,
  windowBoundary,
  sortWindows,
  type BaseRates,
} from "@/lib/pricing/windows";
import { rateShades, shadeOf, type Shade } from "@/lib/pricing/shades";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * A band's colour: "base" for Default Rate hours (grey), a shade 1–5 on the
 * teal scale for every other rate, ranked by price (lib/pricing/shades.ts),
 * or "none" for hours with no rate yet, drawn in the bar's empty slate.
 */
export type BandColor = "base" | "none" | Shade;

/** True when these are the Default plan's Default Rate: the only rates drawn grey. */
export const isDefaultRate = (w: Pick<RateWindow, "slab1" | "slab2">, defaultRate: BaseRates | null) =>
  !!defaultRate && w.slab1 === defaultRate.slab1 && w.slab2 === defaultRate.slab2;

/**
 * The colour tokens in globals.css (`--color-pricing-*`); slate 100 for no
 * rate yet. Each var() is written out in full: Tailwind only emits the @theme
 * variables it finds named in the source, so a built name such as
 * `--color-pricing-rank${n}` would leave the rank colours undefined.
 */
const FILLS: Record<BandColor, string> = {
  base: "var(--color-pricing-base)",
  none: "var(--color-slate-100)",
  1: "var(--color-pricing-rank1)",
  2: "var(--color-pricing-rank2)",
  3: "var(--color-pricing-rank3)",
  4: "var(--color-pricing-rank4)",
  5: "var(--color-pricing-rank5)",
};
const colorOf = (color: BandColor) => FILLS[color];

/**
 * Each window's colour: grey where the rates are Default's Default Rate
 * (`defaultRate`), otherwise its rates' shade among the plan's other rates,
 * cheapest lightest; "none" while a rate isn't a number yet.
 */
export function bandColors<W extends Pick<RateWindow, "slab1" | "slab2">>(windows: W[], defaultRate: BaseRates | null): BandColor[] {
  const shades = rateShades(windows.filter((w) => !isDefaultRate(w, defaultRate)));
  return windows.map((w) => (isDefaultRate(w, defaultRate) ? "base" : shadeOf(shades, w) ?? "none"));
}

/** The small dot that ties a row to its band; round, so it never reads as a checkbox. */
export function WindowSwatch({ color, className }: { color: BandColor; className?: string }) {
  return (
    <span
      aria-hidden="true"
      // A row with no rate yet is an empty slate dot, ringed so it still shows on white.
      className={cn("inline-block w-3 h-3 shrink-0 rounded-full", color === "none" && "ring-1 ring-inset ring-slate-300", className)}
      style={{ backgroundColor: colorOf(color) }}
    />
  );
}

export interface BandItem {
  /** Stable across edits (a form row's key, or a saved window's start), so a moving boundary animates. */
  id: string;
  window: RateWindow;
  color: BandColor;
}

/**
 * A saved version's bands, in time order: grey where the rates are the
 * Default plan's Default Rate (`defaultRate`; null for a plan in another
 * currency), and every other stretch in its rates' shade (`bandColors`).
 */
export function versionBands(windows: RateWindow[], defaultRate: BaseRates | null): BandItem[] {
  const sorted = sortWindows(windows);
  const colors = bandColors(sorted, defaultRate);
  return sorted.map((w, i) => ({ id: w.start, window: w, color: colors[i] }));
}

/** Half the white gap between neighbouring bands, in px: each side gives 1px, so the gap is 2px. */
const HALF_GAP = 1;

/** Rough width of a boundary label ("16:00") at 10px, with breathing room. */
const LABEL_PX = 32;
/** Rough half-width of the "Now · 14:05" label, to keep it inside the bar. */
const NOW_HALF_PX = 32;

/** A boundary as its label, hours and minutes only: a start, "16:00", or the day's inclusive end, "23:59". */
const boundaryLabel = (at: number) => fmtHHmm(at >= DAY_SECONDS ? DAY_SECONDS - 1 : at);

const rate = (n: number) => (Number.isFinite(n) ? String(n) : "–");

/**
 * The day as a 24 h strip: one band per window, no text inside, 2px of white
 * between neighbours; Default Rate hours are grey and every other rate takes
 * its shade by price (`bandColors`).
 * A window that crosses midnight is two bands, one at each end. Under it,
 * the boundary times sit at their boundaries; where two would overlap, a real
 * boundary beats the day's ends, then the earlier one wins.
 *
 * Hovering or focusing a band shows its rates ("Slab 1 KES 110 · Slab 2 KES
 * 90 per kWh") and reports its id through `onHighlight`;
 * `highlighted` (an id) outlines it. `now` marks the current EAT time with
 * an orange line standing past the bar, and "Now · 14:05" above it. Times on the bar are HH:mm; the day
 * always reads 00:00 to 23:59. `compact` is for a table cell: a thinner
 * bar and the marker without its label.
 */
export function DayBandBar({
  items,
  now,
  highlighted,
  onHighlight,
  compact = false,
  currency = "KES",
  className,
}: {
  items: BandItem[];
  now?: string;
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
  compact?: boolean;
  /** The plan's currency, for the rates in the tooltip. */
  currency?: string;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ text: string; color: BandColor; x: number; y: number } | null>(null);

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
  // Hours no band covers (a form still being filled) are drawn too, so they get their gaps.
  const empty = uncovered(bands);

  const labels = boundaryLabels(items.map((i) => parseHHmmss(i.window.start)), width);
  const marker = now ? eatSecondOfDay(now) / DAY_SECONDS : null;

  function show(item: BandItem, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    // A start the axis had no room to label goes in the tooltip, so the times are never lost.
    const unlabelled = !labels.some((l) => l.at === parseHHmmss(item.window.start));
    const text = unlabelled ? `${fmtRateWindowHHmm(item.window)} · ${tipText(item, currency)}` : tipText(item, currency);
    setTip({ text, color: item.color, x: r.left + r.width / 2, y: r.top });
    onHighlight?.(item.id);
  }

  function hide() {
    setTip(null);
    onHighlight?.(null);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {marker !== null && !compact && (
        // mb-1: room for the marker's dot, which rises above the bar.
        <div className="relative h-4 mb-1 text-[10px] font-semibold text-slate-700 tabular-nums">
          {width > 0 && (
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
              style={{ left: Math.min(Math.max(marker * width, NOW_HALF_PX), width - NOW_HALF_PX) }}
            >
              Now · {fmtHHmm(eatSecondOfDay(now!))}
            </span>
          )}
        </div>
      )}
      {/* The marker sits outside the bar's clipped box, so it can stand above and below it. */}
      <div className="relative">
        {/* White behind the bands, so the 2px gaps between them read as white. */}
        <div ref={barRef} className={cn("relative rounded-md bg-white overflow-hidden", compact ? "h-4" : "h-6")}>
          {empty.map((p) => (
            <div key={`empty-${p.a}`} aria-hidden="true" className="absolute inset-y-0" style={{ ...place(p.a, p.b), backgroundColor: colorOf("none") }} />
          ))}
          {bands.map((band) => {
            const on = highlighted === band.id;
            const base = band.color === "base";
            return (
              <div
                key={base ? `${band.id}-${band.window.start}-${band.side}` : `${band.id}-${band.side}`}
                role={band.focusable ? "img" : undefined}
                tabIndex={band.focusable ? 0 : undefined}
                aria-label={band.focusable ? ariaText(band, currency) : undefined}
                aria-hidden={band.focusable ? undefined : true}
                onMouseEnter={(e) => show(band, e.currentTarget)}
                onMouseLeave={hide}
                onFocus={(e) => show(band, e.currentTarget)}
                onBlur={hide}
                className={cn(
                  "absolute inset-y-0 transition-[left,width,opacity] duration-300 ease-out focus:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white",
                  highlighted && !on && "opacity-40",
                  on && "ring-2 ring-inset ring-white"
                )}
                style={{ ...place(band.a, band.b), backgroundColor: colorOf(band.color) }}
              />
            );
          })}
        </div>
        {marker !== null && (
          // Now: a 2px line in the brand orange with 1px of white either side, 4px past the
          // bar at both ends, and a 6px dot on top, so it shows on grey and every teal.
          <div
            aria-hidden="true"
            className="absolute -top-1 -bottom-1 z-20 w-0.5 -translate-x-1/2 bg-zeno-red shadow-[0_0_0_1px_white] pointer-events-none"
            style={{ left: `${marker * 100}%` }}
          >
            <span className="absolute left-1/2 -top-1.5 size-1.5 -translate-x-1/2 rounded-full bg-zeno-red shadow-[0_0_0_1px_white]" />
          </div>
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

/**
 * A band's left and width: pulled in by HALF_GAP wherever it meets a
 * neighbour, so neighbours sit 2px apart, and flush with the bar's ends.
 */
function place(a: number, b: number): React.CSSProperties {
  const left = a > 0 ? HALF_GAP : 0;
  const right = b < 1 ? HALF_GAP : 0;
  return {
    left: `calc(${a * 100}% + ${left}px)`,
    width: `max(0px, calc(${(b - a) * 100}% - ${left + right}px))`,
  };
}

/** The stretches of the day, as fractions, that no band covers. */
function uncovered(bands: { a: number; b: number }[]): { a: number; b: number }[] {
  const out: { a: number; b: number }[] = [];
  let at = 0;
  for (const p of [...bands].sort((x, y) => x.a - y.a)) {
    if (p.a > at) out.push({ a: at, b: p.a });
    at = Math.max(at, p.b);
  }
  if (at < 1) out.push({ a: at, b: 1 });
  return out;
}

/** The tooltip: the band's rates, which the bar can't show; its times are already on the axis. */
function tipText({ window: w }: BandItem, currency: string): string {
  if (!Number.isFinite(w.slab1) && !Number.isFinite(w.slab2)) return "No rates yet";
  return `Slab 1 ${currency} ${rate(w.slab1)} · Slab 2 ${currency} ${rate(w.slab2)} per kWh`;
}

/** For screen readers, which can't see the axis: the times as well as the rates. */
function ariaText(item: BandItem, currency: string): string {
  return `${fmtRateWindowHHmm(item.window)}: ${tipText(item, currency)}`;
}

/**
 * The boundary labels that fit at `width` px. The day's ends, 00:00 and
 * 23:59, are always shown; then every window start, earliest first, skipping
 * any that would overlap a label already placed.
 */
function boundaryLabels(starts: number[], width: number): { at: number }[] {
  if (width <= 0) return [];
  const real = [...new Set(starts.map((s) => s % DAY_SECONDS))].filter((s) => s !== 0).sort((a, b) => a - b);

  // Each label's span in px: the ends sit flush with the bar's edges, the rest are centred.
  const span = (at: number): [number, number] => {
    const x = (at / DAY_SECONDS) * width;
    if (at === 0) return [0, LABEL_PX];
    if (at === DAY_SECONDS) return [width - LABEL_PX, width];
    return [x - LABEL_PX / 2, x + LABEL_PX / 2];
  };
  const placed: { at: number; s: [number, number] }[] = [0, DAY_SECONDS].map((at) => ({ at, s: span(at) }));
  for (const at of real) {
    const s = span(at);
    if (placed.every((p) => s[1] <= p.s[0] || s[0] >= p.s[1])) placed.push({ at, s });
  }
  return placed.map(({ at }) => ({ at })).sort((x, y) => x.at - y.at);
}

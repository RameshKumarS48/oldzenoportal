"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DAY_SECONDS,
  fmtHHmm,
  fmtRateWindowHHmm,
  parseHHmmss,
  windowBoundary,
  sortWindows,
} from "@/lib/pricing/windows";
import { SLAB1_DAILY_KWH } from "@/lib/pricing/engine";
import { LABEL_INSET, placeLabels } from "@/lib/pricing/rate-labels";
import { rateShades, shadeOf, type Shade } from "@/lib/pricing/shades";
import type { RateWindow } from "@/lib/pricing/types";

/**
 * A band's colour: "base" for Default Rate hours (grey), a shade 1–5 on the
 * teal scale for every other rate, ranked by price (lib/pricing/shades.ts),
 * or "none" for hours with no rate yet, drawn in the bar's empty slate.
 */
export type BandColor = "base" | "none" | Shade;

/** Is this window the Default Rate: all of the Default plan, or hours another plan links to it? */
const isDefaultRate = (w: Pick<RateWindow, "linkedToDefault">, isDefaultPlan: boolean) => isDefaultPlan || !!w.linkedToDefault;

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
/** A band colour as a CSS colour, for swatches drawn outside the bar (the schedule legend). */
export const colorOf = (color: BandColor) => FILLS[color];

/**
 * Each window's colour: grey for the Default Rate (every window of the
 * Default plan, or a `linkedToDefault` one elsewhere), otherwise its rates'
 * shade among the plan's own rates, cheapest lightest; "none" while a rate
 * isn't a number yet. A plan's own window at the Default Rate's values is
 * still its own, so it's teal.
 */
export function bandColors<W extends Pick<RateWindow, "slab1" | "slab2" | "linkedToDefault">>(windows: W[], isDefaultPlan: boolean): BandColor[] {
  const shades = rateShades(windows.filter((w) => !isDefaultRate(w, isDefaultPlan)));
  return windows.map((w) => (isDefaultRate(w, isDefaultPlan) ? "base" : shadeOf(shades, w) ?? "none"));
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
 * A saved version's bands, in time order: grey for the Default Rate (the
 * Default plan's, or hours linked to it), and every other stretch in its
 * rates' shade (`bandColors`).
 */
export function versionBands(windows: RateWindow[], isDefaultPlan: boolean): BandItem[] {
  const sorted = sortWindows(windows);
  const colors = bandColors(sorted, isDefaultPlan);
  return sorted.map((w, i) => ({ id: w.start, window: w, color: colors[i] }));
}

/** Half the white gap between neighbouring bands, in px: each side gives 1px, so the gap is 2px. */
const HALF_GAP = 1;

/** Rough width of a boundary label ("16:00") at 10px, with breathing room. */
const LABEL_PX = 32;

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
 * 90 per kWh") and reports its id through `onHighlight` and its colour
 * through `onHighlightColor`. `highlighted` (an id) outlines that band and
 * dims the rest; `highlightedColor` (a rate's colour, as a legend names it)
 * dims every band in another colour. Times on the bar are HH:mm; the day
 * always reads 00:00 to 23:59. `compact` is for a table cell: a thinner bar.
 */
export function DayBandBar({
  items,
  highlighted,
  onHighlight,
  highlightedColor,
  onHighlightColor,
  compact = false,
  rateLabels = false,
  currency = "KES",
  className,
}: {
  items: BandItem[];
  highlighted?: string | null;
  onHighlight?: (id: string | null) => void;
  /** Each colour is one rate, so a colour picks out every band at that rate. */
  highlightedColor?: BandColor | null;
  onHighlightColor?: (color: BandColor | null) => void;
  compact?: boolean;
  /**
   * The plans table: label each rate above the bar ("100/80"), at the start of its widest
   * segment, and a tooltip with the times and each slab spelt out.
   */
  rateLabels?: boolean;
  /** The plan's currency, for the rates in the tooltip. */
  currency?: string;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ text: string; detail?: TipDetail; color: BandColor; x: number; y: number } | null>(null);

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

  // With rate labels (the plans table), times start LABEL_INSET into their segment, under the rate labels.
  // Labels and times start LABEL_INSET into the visible segment, past its half of the gap.
  const inset = rateLabels ? HALF_GAP + LABEL_INSET : null;
  const labels = boundaryLabels(items.map((i) => parseHHmmss(i.window.start)), width, inset);

  // One rate label per colour (each colour is one rate), at the start of that rate's widest segment.
  const rates = rateLabels ? rateSpots(bands) : [];
  const ratesKey = rates.map((l) => `${l.color}:${l.slab1}/${l.slab2}`).join("|");
  const measureRef = useRef<HTMLDivElement>(null);
  const [labelWidths, setLabelWidths] = useState<Record<string, number>>({});
  // Each label's real width, from invisible copies, so the layout never guesses at text widths.
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const read = () =>
      setLabelWidths(Object.fromEntries(Array.from(el.children, (c) => [(c as HTMLElement).dataset.key!, (c as HTMLElement).offsetWidth])));
    const ro = new ResizeObserver(read);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [ratesKey]);
  const placed =
    width > 0 && rates.every((l) => labelWidths[String(l.color)] !== undefined)
      ? placeLabels(rates.map((l) => ({ key: String(l.color), anchor: l.start * width + HALF_GAP + LABEL_INSET, width: labelWidths[String(l.color)] })), width)
      : [];

  function show(item: BandItem, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    // A start the axis had no room to label goes in the tooltip, so the times are never lost.
    const unlabelled = !labels.some((l) => l.at === parseHHmmss(item.window.start));
    if (rateLabels) {
      // The plans table: the window and its rate, then each slab spelt out on its own line.
      setTip({ text: tipTitle(item), detail: tipDetail(item, currency), color: item.color, x: r.left + r.width / 2, y: r.top });
    } else {
      const text = unlabelled ? `${fmtRateWindowHHmm(item.window)} · ${tipText(item, currency)}` : tipText(item, currency);
      setTip({ text, color: item.color, x: r.left + r.width / 2, y: r.top });
    }
    onHighlight?.(item.id);
    onHighlightColor?.(item.color);
  }

  function hide() {
    setTip(null);
    onHighlight?.(null);
    onHighlightColor?.(null);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {rateLabels && (
        // The labels' 16px line, then a 4px strip, so text always ends at least 4px above the bar;
        // the strip carries the ticks down to segments a label had to move off. -mb-1 cancels the
        // stack's gap, so the ticks meet the bar.
        <div className="relative h-5 -mb-1" aria-hidden="true">
          <div ref={measureRef} className="invisible absolute flex" inert>
            {rates.map((l) => (
              <span key={l.color} data-key={l.color} className={RATE_LABEL}>
                <RateText slab1={l.slab1} slab2={l.slab2} />
              </span>
            ))}
          </div>
          {placed.map((p) => {
            const rate = rates.find((l) => String(l.color) === p.key)!;
            return (
              <span
                key={p.key}
                onMouseEnter={() => onHighlightColor?.(rate.color)}
                onMouseLeave={() => onHighlightColor?.(null)}
                className={cn(RATE_LABEL, "absolute top-0 cursor-default")}
                style={{ left: p.left }}
              >
                <RateText slab1={rate.slab1} slab2={rate.slab2} />
              </span>
            );
          })}
          <svg className="absolute left-0 top-4 h-1 w-full overflow-visible" aria-hidden="true">
            {placed
              .filter((p) => p.tick)
              .map((p) => (
                <line
                  key={p.key}
                  x1={p.left}
                  y1={0}
                  x2={p.anchor}
                  y2={4}
                  stroke="var(--color-slate-300)"
                  strokeWidth={1}
                />
              ))}
          </svg>
        </div>
      )}
      {/* White behind the bands, so the 2px gaps between them read as white. */}
      <div ref={barRef} className={cn("relative rounded-md bg-white overflow-hidden", compact ? "h-4" : "h-6")}>
        {empty.map((p) => (
          <div key={`empty-${p.a}`} aria-hidden="true" className="absolute inset-y-0" style={{ ...place(p.a, p.b), backgroundColor: colorOf("none") }} />
        ))}
        {bands.map((band) => {
          const on = highlighted === band.id;
          const dimmed = (highlighted && !on) || (highlightedColor != null && band.color !== highlightedColor);
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
                dimmed && "opacity-40",
                on && "ring-2 ring-inset ring-white"
              )}
              style={{ ...place(band.a, band.b), backgroundColor: colorOf(band.color) }}
            />
          );
        })}
      </div>

      {/* The plans table's times are 11px; elsewhere 10px. Both slate-400, quieter than the rate labels above. */}
      <div
        className={cn("relative h-4 text-slate-400 tabular-nums", rateLabels ? "text-[11px]" : "text-[10px]")}
        aria-hidden="true"
      >
        {labels.map((l) => (
          <span
            key={l.at}
            className={cn(
              "absolute top-0 whitespace-nowrap",
              l.at === DAY_SECONDS ? "right-0" : inset !== null ? undefined : l.at === 0 ? "left-0" : "-translate-x-1/2"
            )}
            style={
              l.at === DAY_SECONDS || (inset === null && l.at === 0)
                ? undefined
                : { left: inset !== null ? `calc(${(l.at / DAY_SECONDS) * 100}% + ${inset}px)` : `${(l.at / DAY_SECONDS) * 100}%` }
            }
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
          {/* A 1px light ring keeps every rate's colour, dark teals included, visible on the dark tooltip. */}
          <WindowSwatch color={tip.color} className={cn("ring-1 ring-white/70", tip.detail && "self-start mt-0.5")} />
          {tip.detail ? (
            <span className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
              <span className="col-span-2 font-semibold">{tip.text}</span>
              {tip.detail.map((row) => (
                <Fragment key={row.label}>
                  <span>
                    <span className="font-medium">{row.label}</span>
                    <span className="block text-[11px] text-slate-300">{row.note}</span>
                  </span>
                  <span className="text-right font-semibold">{row.value}</span>
                </Fragment>
              ))}
            </span>
          ) : (
            tip.text
          )}
        </span>
      )}
    </div>
  );
}

/** A rate label's text style: small, tabular, in the default text colour. */
// 12px regular on a 16px line; slab 1 slate-700, "/slab 2" slate-500 (RateText), one baseline.
const RATE_LABEL = "whitespace-nowrap text-xs leading-4 text-slate-700 tabular-nums";

/** A rate label, "90/70": slab 1 in the label colour, "/" and slab 2 muted, never lighter than slate-500 (4.5:1 on white). */
function RateText({ slab1, slab2 }: { slab1: number; slab2: number }) {
  return (
    <>
      {rate(slab1)}
      <span className="text-slate-500">/{rate(slab2)}</span>
    </>
  );
}

type TipDetail = { label: string; note: string; value: string }[];

/** The plans table's tooltip heading: the window, how long it runs, and the Default Rate where it's grey. */
function tipTitle({ window: w, color }: BandItem): string {
  const hours = Math.round((windowBoundary(w) - parseHHmmss(w.start) + DAY_SECONDS) % DAY_SECONDS / 3600) || 24;
  return `${fmtRateWindowHHmm(w)} · ${hours} h${color === "base" ? " · Default Rate" : ""}`;
}

/** The plans table's tooltip rows: each slab named, what it covers, and its rate. */
function tipDetail({ window: w }: BandItem, currency: string): TipDetail {
  return [
    { label: "Slab 1", note: `A rider's first ${SLAB1_DAILY_KWH} kWh each day`, value: `${rate(w.slab1)} ${currency}/kWh` },
    { label: "Slab 2", note: "Every kWh after that, the same day", value: `${rate(w.slab2)} ${currency}/kWh` },
  ];
}

/**
 * Each rate's label and where it wants to sit: one per colour, at the start
 * (as a fraction of the day) of that colour's widest piece.
 */
function rateSpots(bands: (BandItem & { a: number; b: number })[]): { color: BandColor; slab1: number; slab2: number; start: number }[] {
  const widest = new Map<BandColor, BandItem & { a: number; b: number }>();
  for (const band of bands) {
    const best = widest.get(band.color);
    if (!best || band.b - band.a > best.b - best.a) widest.set(band.color, band);
  }
  return [...widest.values()].map((band) => ({
    color: band.color,
    slab1: band.window.slab1,
    slab2: band.window.slab2,
    start: band.a,
  }));
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
 * any that would overlap a label already placed. With `inset` (px), each
 * start's label begins that far into its segment rather than centred on the
 * boundary, so it lines up with the rate label above.
 */
function boundaryLabels(starts: number[], width: number, inset: number | null = null): { at: number }[] {
  if (width <= 0) return [];
  const real = [...new Set(starts.map((s) => s % DAY_SECONDS))].filter((s) => s !== 0).sort((a, b) => a - b);

  // Each label's span in px: the day's end sits flush with the bar's right edge; with `inset`,
  // every start sits that far into its segment, else 00:00 is flush left and the rest are centred.
  const span = (at: number): [number, number] => {
    const x = (at / DAY_SECONDS) * width;
    if (at === DAY_SECONDS) return [width - LABEL_PX, width];
    if (inset !== null) return [x + inset, x + inset + LABEL_PX];
    if (at === 0) return [0, LABEL_PX];
    return [x - LABEL_PX / 2, x + LABEL_PX / 2];
  };
  const placed: { at: number; s: [number, number] }[] = [0, DAY_SECONDS].map((at) => ({ at, s: span(at) }));
  for (const at of real) {
    const s = span(at);
    if (placed.every((p) => s[1] <= p.s[0] || s[0] >= p.s[1])) placed.push({ at, s });
  }
  return placed.map(({ at }) => ({ at })).sort((x, y) => x.at - y.at);
}

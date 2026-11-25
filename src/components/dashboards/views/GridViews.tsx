"use client";

/** Views that aren't plots: numbers, grids, tables and lists. */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Result } from "@/lib/dashboards/query";
import { cn } from "@/lib/utils";
import { change, compact, full, rampColor, rampInk, SERIES, seriesColor } from "./format";

type Value = Extract<Result, { type: "value" }>;
type Groups = Extract<Result, { type: "groups" }>;
type Matrix = Extract<Result, { type: "matrix" }>;

function Delta({ now, before, label }: { now: number; before: number | null; label: string }) {
  const pct = change(now, before);
  if (pct == null) return null;
  const Icon = Math.abs(pct) < 0.05 ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="font-medium tabular-nums text-slate-700">{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span> {label}
    </p>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 3) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 26}`).join(" ");
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-8 w-full" aria-hidden><polyline points={pts} fill="none" stroke="var(--s1)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
}

export function NumberView({ result, compareLabel }: { result: Value; compareLabel: string }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-800" title={full(result.value, result.unit)}>{compact(result.value, result.unit)}</p>
      <Delta now={result.value} before={result.previous} label={compareLabel} />
      <Spark values={result.spark} />
    </div>
  );
}

export function PairView({ result }: { result: Value }) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {[{ label: result.label, value: result.value, unit: result.unit }, ...(result.second ? [result.second] : [])].map((x, i) => (
        <div key={i}>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-sm" style={{ background: SERIES[i] }} />{x.label}</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-800" title={full(x.value, x.unit)}>{compact(x.value, x.unit)}</p>
        </div>
      ))}
    </div>
  );
}

export function TargetView({ result, target }: { result: Value; target: number }) {
  const pct = Math.max(0, (result.value / target) * 100);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-800" title={full(result.value, result.unit)}>{compact(result.value, result.unit)}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: "var(--s1)" }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500"><span className="font-medium tabular-nums text-slate-700">{pct.toFixed(0)}%</span> of the {compact(target, result.unit)} target</p>
    </div>
  );
}

export function GaugeView({ result, target }: { result: Value; target: number }) {
  const share = Math.max(0, Math.min(1, result.value / target));
  const arc = Math.PI * 80;
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-[220px]" role="img" aria-label={`${(share * 100).toFixed(0)}% of target`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--viz-grid)" strokeWidth={14} strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--s1)" strokeWidth={14} strokeLinecap="round" strokeDasharray={`${arc * share} ${arc}`} />
        <text x={100} y={88} textAnchor="middle" fontSize={26} fontWeight={600} fill="var(--viz-ink)">{compact(result.value, result.unit)}</text>
        <text x={100} y={106} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">of {compact(target, result.unit)}</text>
      </svg>
    </div>
  );
}

const TH = "px-2 py-1.5 text-left text-[11px] font-medium text-slate-500";
const TD = "px-2 py-1.5 text-xs text-slate-700";

export function DataTable({ result }: { result: Groups }) {
  const total = result.additive ? result.rows.reduce((s, r) => s + r.value, 0) : null;
  const two = result.rows.some((r) => r.value2 != null);
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200"><th className={TH} /><th className={cn(TH, "text-right")}>{result.names[0]}</th>{two && <th className={cn(TH, "text-right")}>{result.names[1]}</th>}{total != null && !two && <th className={cn(TH, "text-right")}>Share</th>}</tr></thead>
        <tbody>
          {result.rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-100">
              <td className={TD}>{r.label}</td>
              <td className={cn(TD, "text-right tabular-nums")}>{full(r.value, result.unit)}</td>
              {two && <td className={cn(TD, "text-right tabular-nums")}>{r.value2 == null ? "–" : full(r.value2, result.unit2)}</td>}
              {total != null && !two && <td className={cn(TD, "text-right tabular-nums text-slate-500")}>{total ? ((r.value / total) * 100).toFixed(1) : 0}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TopList({ result }: { result: Groups }) {
  const max = Math.max(...result.rows.map((r) => r.value), 1);
  return (
    <ol className="h-full space-y-2 overflow-auto">
      {result.rows.filter((r) => r.label !== "Other").map((r, i) => (
        <li key={r.label} className="text-xs">
          <div className="flex items-baseline gap-2">
            <span className="w-4 shrink-0 tabular-nums text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{r.label}</span>
            <span className="tabular-nums font-medium text-slate-800">{full(r.value, result.unit)}</span>
          </div>
          <div className="ml-6 mt-1 h-1 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--s1)" }} /></div>
        </li>
      ))}
    </ol>
  );
}

export function Tiles({ result }: { result: Groups }) {
  return (
    <div className="grid h-full auto-rows-fr grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
      {result.rows.map((r, i) => (
        <div key={r.label} className="rounded-lg border border-slate-200 px-3 py-2">
          <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: seriesColor(r.label, i) }} />{r.label}</p>
          <p className="text-lg font-semibold tabular-nums text-slate-800" title={full(r.value, result.unit)}>{compact(r.value, result.unit)}</p>
        </div>
      ))}
    </div>
  );
}

/** A grid coloured by size: rows by columns, or weekday by hour. */
export function HeatGrid({ result, showValues }: { result: Matrix; showValues: boolean }) {
  const max = Math.max(...result.cells.flat(), 0);
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
        <thead><tr><th />{result.cols.map((c) => <th key={c} className="px-0.5 pb-1 text-[10px] font-normal text-slate-400">{c.length > 9 ? `${c.slice(0, 8)}…` : c}</th>)}</tr></thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={r}>
              <th className="whitespace-nowrap pr-2 text-right text-[11px] font-normal text-slate-500">{r.length > 18 ? `${r.slice(0, 17)}…` : r}</th>
              {result.cols.map((c, j) => {
                const v = result.cells[i][j];
                return <td key={c} title={`${r} · ${c}: ${full(v, result.unit)}`} className="h-6 rounded text-center text-[10px] tabular-nums" style={{ background: rampColor(v, max), color: rampInk(v, max), minWidth: showValues ? 44 : 12 }}>{showValues ? compact(v) : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <RampLegend max={max} unit={result.unit} />
    </div>
  );
}

function RampLegend({ max, unit }: { max: number; unit: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
      0 {[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className="h-2 w-4 rounded-sm" style={{ background: `var(--ramp-${n})` }} />)} {compact(max, unit)}
    </p>
  );
}

export function PivotTable({ result }: { result: Matrix }) {
  const colTotals = result.cols.map((_, j) => result.cells.reduce((s, row) => s + row[j], 0));
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200"><th className={TH} />{result.cols.map((c) => <th key={c} className={cn(TH, "text-right")}>{c}</th>)}<th className={cn(TH, "text-right")}>Total</th></tr></thead>
        <tbody>
          {result.rows.map((r, i) => (
            <tr key={r} className="border-b border-slate-100">
              <td className={TD}>{r}</td>
              {result.cells[i].map((v, j) => <td key={j} className={cn(TD, "text-right tabular-nums")}>{full(v, result.unit)}</td>)}
              <td className={cn(TD, "text-right font-medium tabular-nums")}>{full(result.cells[i].reduce((a, b) => a + b, 0), result.unit)}</td>
            </tr>
          ))}
          <tr><td className={cn(TD, "font-medium")}>Total</td>{colTotals.map((v, j) => <td key={j} className={cn(TD, "text-right font-medium tabular-nums")}>{full(v, result.unit)}</td>)}<td className={cn(TD, "text-right font-medium tabular-nums")}>{full(colTotals.reduce((a, b) => a + b, 0), result.unit)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

/** One square per day, a column per week. */
export function CalendarHeat({ result }: { result: Extract<Result, { type: "series" }> }) {
  const values = result.series[0]?.values ?? [];
  const unit = result.series[0]?.unit ?? "";
  const max = Math.max(...values, 0);
  const firstDow = (new Date(`${result.labels[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: ({ day: string; v: number } | null)[] = [...Array.from({ length: firstDow }, () => null), ...result.labels.map((day, i) => ({ day, v: values[i] }))];
  const weeks = Math.ceil(cells.length / 7);
  return (
    <div className="flex h-full flex-col justify-center overflow-auto">
      <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))` }}>
        {cells.map((c, i) => (
          <div key={i} title={c ? `${c.day}: ${full(c.v, unit)}` : undefined} className="aspect-square max-h-5 rounded-[3px]" style={{ background: c ? (c.v > 0 ? rampColor(c.v, max) : "var(--viz-grid)") : "transparent" }} />
        ))}
      </div>
      <div className="flex items-center justify-between"><p className="mt-2 text-[10px] text-slate-400">{result.labels[0]} to {result.labels[result.labels.length - 1]} · weeks start on Monday</p><RampLegend max={max} unit={unit} /></div>
    </div>
  );
}

export function BoxPlot({ result }: { result: Extract<Result, { type: "box" }> }) {
  const max = Math.max(...result.rows.map((r) => r.max), 1);
  const x = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 overflow-auto">
      {result.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-[11px]" title={`${r.label}: lowest ${full(r.min, result.unit)}, middle half ${full(r.q1, result.unit)} to ${full(r.q3, result.unit)}, typical ${full(r.median, result.unit)}, highest ${full(r.max, result.unit)}`}>
          <span className="w-28 shrink-0 truncate text-right text-slate-500">{r.label}</span>
          <div className="relative h-5 flex-1">
            <div className="absolute top-1/2 h-px -translate-y-1/2 bg-slate-400" style={{ left: x(r.min), width: x(r.max - r.min) }} />
            <div className="absolute top-0.5 bottom-0.5 rounded-sm" style={{ left: x(r.q1), width: x(r.q3 - r.q1), background: "var(--s1)", opacity: 0.85 }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: x(r.median) }} />
          </div>
          <span className="w-16 shrink-0 tabular-nums text-slate-700">{compact(r.median, result.unit)}</span>
        </div>
      ))}
      <p className="pl-[7.5rem] text-[10px] text-slate-400">Line: lowest to highest · Box: the middle half · Mark: the typical value</p>
    </div>
  );
}

export function FunnelView({ result }: { result: Extract<Result, { type: "funnel" }> }) {
  const first = result.steps[0]?.value || 1;
  return (
    <ol className="flex h-full flex-col justify-center gap-2 overflow-auto">
      {result.steps.map((s, i) => {
        const prev = result.steps[i - 1]?.value;
        return (
          <li key={i} className="text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-slate-700"><span className="mr-1.5 tabular-nums text-slate-400">{i + 1}</span>{s.label}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                <span className="font-medium text-slate-800">{full(s.value)}</span>
                {prev ? <> · {((s.value / prev) * 100).toFixed(0)}% of the step before</> : null}
                {s.hours != null ? <> · typically {s.hours < 1 ? `${Math.round(s.hours * 60)} min` : `${s.hours.toFixed(1)} h`} later</> : null}
              </span>
            </div>
            <div className="mt-1 h-4 rounded bg-slate-100"><div className="h-full rounded" style={{ width: `${Math.max(1, (s.value / first) * 100)}%`, background: `var(--ramp-${Math.max(2, 5 - Math.min(3, i))})` }} /></div>
          </li>
        );
      })}
      {result.steps.length > 1 && <li className="pt-1 text-[11px] text-slate-500">{((result.steps[result.steps.length - 1].value / first) * 100).toFixed(1)}% get from the first step to the last.</li>}
    </ol>
  );
}

export function RetentionGrid({ result }: { result: Extract<Result, { type: "retention" }> }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
        <thead><tr><th className={TH}>Week starting</th><th className={cn(TH, "text-right")}>Started</th>{result.periods.map((p) => <th key={p} className="px-1 text-[10px] font-normal text-slate-400">{p}</th>)}</tr></thead>
        <tbody>
          {result.cohorts.map((c) => (
            <tr key={c.label}>
              <td className="whitespace-nowrap px-2 text-xs text-slate-700">{c.label}</td>
              <td className="px-2 text-right text-xs tabular-nums text-slate-500">{full(c.size)}</td>
              {result.periods.map((p, k) => {
                const v = c.cells[k];
                return v == null ? <td key={p} /> : <td key={p} title={`${c.label}, ${p.toLowerCase()}: ${v}% came back`} className="h-7 rounded text-center text-[11px] tabular-nums" style={{ background: rampColor(v, 100), color: rampInk(v, 100) }}>{v.toFixed(0)}%</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordsTable({ result }: { result: Extract<Result, { type: "records" }> }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-200">{result.columns.map((c) => <th key={c} className={cn(TH, "whitespace-nowrap")}>{c}</th>)}</tr></thead>
        <tbody>{result.rows.map((row, i) => <tr key={i} className="border-b border-slate-100">{row.map((v, j) => <td key={j} className={cn(TD, "whitespace-nowrap tabular-nums")}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

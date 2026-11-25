"use client";

/**
 * The plotted views. One y-axis per chart, always: two measures of different
 * units are drawn as two charts sharing the x-axis, never on two scales.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Sankey, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis, ZAxis,
} from "recharts";
import type { Result } from "@/lib/dashboards/query";
import { compact, full, OTHER, SERIES, seriesColor } from "./format";

type Series = Extract<Result, { type: "series" }>;
type Groups = Extract<Result, { type: "groups" }>;
type Matrix = Extract<Result, { type: "matrix" }>;

const TICK = { fontSize: 11, fill: "var(--viz-axis)" };
const TOOLTIP = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: "1px solid var(--viz-grid)", background: "var(--viz-surface)", color: "var(--viz-ink)", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)" },
  labelStyle: { fontWeight: 600, marginBottom: 2, color: "var(--viz-ink)" },
  itemStyle: { color: "var(--viz-ink)", padding: 0 },
  cursor: { stroke: "var(--viz-axis)", strokeWidth: 1, fill: "var(--viz-grid)", fillOpacity: 0.5 },
};
// Legend names stay in text colour; the swatch beside them carries the series colour.
const LEGEND = { wrapperStyle: { fontSize: 11, paddingTop: 6 }, iconSize: 8, itemSorter: null, formatter: (value: string) => <span style={{ color: "var(--viz-muted)" }}>{value}</span> };
const MARGIN = { top: 6, right: 12, left: 0, bottom: 0 };
const Fill = ({ children }: { children: React.ReactElement }) => <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>;

/** Rows keyed by series name, as Recharts wants them. */
const rowsOf = (r: Series, extra?: (i: number) => Record<string, number>) =>
  r.labels.map((label, i) => ({ label, ...Object.fromEntries(r.series.map((s) => [s.name, s.values[i]])), ...(r.previous ? { [r.previous.name]: r.previous.values[i] } : {}), ...extra?.(i) }));

export function TimeChart({ result, mode }: { result: Series; mode: "line" | "area" | "columns" | "lines" | "stacked_area" | "stacked_columns" | "stacked_100" }) {
  const unit = mode === "stacked_100" ? "%" : result.series[0]?.unit ?? "";
  const totals = result.labels.map((_, i) => result.series.reduce((s, x) => s + x.values[i], 0));
  const data = mode === "stacked_100"
    ? result.labels.map((label, i) => ({ label, ...Object.fromEntries(result.series.map((s) => [s.name, totals[i] ? Math.round((s.values[i] / totals[i]) * 1000) / 10 : 0])) }))
    : rowsOf(result);
  const many = result.series.length > 1;
  const axes = (
    <>
      <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
      <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} minTickGap={28} />
      <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v, unit === "%" ? "%" : "")} domain={mode === "stacked_100" ? [0, 100] : undefined} />
      <Tooltip {...TOOLTIP} formatter={(v) => full(Number(v), unit)} />
      {(many || result.previous) && <Legend {...LEGEND} />}
    </>
  );
  if (mode === "columns" || mode === "stacked_columns" || mode === "stacked_100") {
    return (
      <Fill>
        <BarChart data={data} margin={MARGIN} barCategoryGap="18%">
          {axes}
          {result.series.map((s, i) => <Bar key={s.name} dataKey={s.name} stackId={mode === "columns" ? undefined : "a"} fill={seriesColor(s.name, i)} radius={many ? 0 : [4, 4, 0, 0]} stroke="var(--viz-surface)" strokeWidth={many ? 1 : 0} maxBarSize={36} />)}
        </BarChart>
      </Fill>
    );
  }
  if (mode === "area" || mode === "stacked_area") {
    return (
      <Fill>
        <AreaChart data={data} margin={MARGIN}>
          {axes}
          {result.series.map((s, i) => <Area key={s.name} type="monotone" dataKey={s.name} stackId={mode === "stacked_area" ? "a" : undefined} stroke={seriesColor(s.name, i)} strokeWidth={2} fill={seriesColor(s.name, i)} fillOpacity={mode === "stacked_area" ? 0.75 : 0.18} />)}
        </AreaChart>
      </Fill>
    );
  }
  return (
    <Fill>
      <LineChart data={data} margin={MARGIN}>
        {axes}
        {result.previous && <Line type="monotone" dataKey={result.previous.name} stroke={OTHER} strokeWidth={2} strokeDasharray="4 4" dot={false} />}
        {result.series.map((s, i) => <Line key={s.name} type="monotone" dataKey={s.name} stroke={seriesColor(s.name, i)} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--viz-surface)", strokeWidth: 2 }} />)}
      </LineChart>
    </Fill>
  );
}

/** Two measures, two charts, one shared time axis. */
export function TwoCharts({ result }: { result: Series }) {
  return (
    <div className="flex h-full flex-col gap-2">
      {result.series.slice(0, 2).map((s, i) => (
        <div key={s.name} className="min-h-0 flex-1">
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-sm" style={{ background: SERIES[i] }} />{s.name}</p>
          <div className="h-[calc(100%-18px)]">
            <Fill>
              {i === 0 ? (
                <BarChart data={rowsOf({ ...result, series: [s] })} margin={MARGIN} barCategoryGap="18%">
                  <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                  <XAxis dataKey="label" hide />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} />
                  <Tooltip {...TOOLTIP} formatter={(v) => full(Number(v), s.unit)} />
                  <Bar dataKey={s.name} fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              ) : (
                <LineChart data={rowsOf({ ...result, series: [s] })} margin={MARGIN}>
                  <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
                  <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} />
                  <Tooltip {...TOOLTIP} formatter={(v) => full(Number(v), s.unit)} />
                  <Line type="monotone" dataKey={s.name} stroke={SERIES[1]} strokeWidth={2} dot={false} />
                </LineChart>
              )}
            </Fill>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two measures on one scale: each as a percentage of its own first value. */
export function IndexedLines({ result }: { result: Series }) {
  const indexed: Series = { ...result, previous: undefined, series: result.series.map((s) => {
    const base = s.values.find((v) => v !== 0) ?? 1;
    return { ...s, unit: "", values: s.values.map((v) => Math.round((v / base) * 1000) / 10) };
  }) };
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1"><TimeChart result={indexed} mode="lines" /></div>
      <p className="pt-1 text-[11px] text-slate-400">Each line starts at 100, so two different units can be compared.</p>
    </div>
  );
}

export function CategoryBars({ result, mode }: { result: Groups; mode: "bars" | "columns_cat" }) {
  const data = result.rows.map((r) => ({ label: r.label, value: r.value }));
  const cells = data.map((d) => <Cell key={d.label} fill={d.label === "Other" ? OTHER : SERIES[0]} />);
  if (mode === "columns_cat") {
    return (
      <Fill>
        <BarChart data={data} margin={MARGIN} barCategoryGap="22%">
          <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => (v.length > 11 ? `${v.slice(0, 10)}…` : v)} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} />
          <Tooltip {...TOOLTIP} formatter={(v) => [full(Number(v), result.unit), result.names[0]]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>{cells}</Bar>
        </BarChart>
      </Fill>
    );
  }
  return (
    <Fill>
      <BarChart data={data} layout="vertical" margin={{ ...MARGIN, right: 56 }} barCategoryGap="22%">
        <CartesianGrid stroke="var(--viz-grid)" horizontal={false} />
        <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
        <YAxis type="category" dataKey="label" tick={TICK} tickLine={false} axisLine={false} width={150} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
        <Tooltip {...TOOLTIP} formatter={(v) => [full(Number(v), result.unit), result.names[0]]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: "var(--viz-muted)", formatter: (v: unknown) => compact(Number(v), result.unit === "%" ? "%" : "") }}>{cells}</Bar>
      </BarChart>
    </Fill>
  );
}

export function Donut({ result }: { result: Groups }) {
  const total = result.rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-full min-w-0 flex-1">
        <Fill>
          <PieChart>
            <Pie data={result.rows} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="92%" paddingAngle={1} stroke="var(--viz-surface)" strokeWidth={2}>
              {result.rows.map((r, i) => <Cell key={r.label} fill={seriesColor(r.label, i)} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={(v) => `${full(Number(v), result.unit)} · ${total ? ((Number(v) / total) * 100).toFixed(1) : 0}%`} />
          </PieChart>
        </Fill>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-lg font-semibold tabular-nums text-slate-800">{compact(total, result.unit)}</p><p className="text-[10px] text-slate-400">Total</p></div>
        </div>
      </div>
      <ul className="max-h-full w-40 shrink-0 space-y-1 overflow-auto text-[11px]">
        {result.rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: seriesColor(r.label, i) }} />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            <span className="tabular-nums text-slate-500">{total ? ((r.value / total) * 100).toFixed(0) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TreeCell(props: { x?: number; y?: number; width?: number; height?: number; index?: number; name?: string; value?: number; unit?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name = "", value = 0, unit = "" } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={seriesColor(name, index)} stroke="var(--viz-surface)" strokeWidth={2}><title>{`${name}: ${full(value, unit)}`}</title></rect>
      {width > 64 && height > 34 && (
        <>
          <text x={x + 8} y={y + 16} fontSize={11} fontWeight={600} fill="#fff" stroke="none">{name.length > width / 7 ? `${name.slice(0, Math.floor(width / 7) - 1)}…` : name}</text>
          <text x={x + 8} y={y + 30} fontSize={11} fill="#fff" fillOpacity={0.9} stroke="none">{compact(value, unit)}</text>
        </>
      )}
    </g>
  );
}

export function TreemapView({ result }: { result: Groups }) {
  return (
    <Fill>
      <Treemap data={result.rows.map((r) => ({ name: r.label, value: r.value }))} dataKey="value" isAnimationActive={false} content={<TreeCell unit={result.unit} />} />
    </Fill>
  );
}

/** How a total is built from its parts, or how a number moved from period to period. */
export function Waterfall({ result }: { result: Groups | Series }) {
  let steps: { label: string; base: number; up: number; down: number; value: number }[];
  let unit: string;
  if (result.type === "groups") {
    unit = result.unit;
    let run = 0;
    steps = result.rows.map((r) => { const s = { label: r.label, base: run, up: r.value, down: 0, value: r.value }; run += r.value; return s; });
    steps.push({ label: "Total", base: 0, up: run, down: 0, value: run });
  } else {
    const values = result.series[0]?.values ?? [];
    unit = result.series[0]?.unit ?? "";
    steps = values.map((v, i) => {
      if (i === 0) return { label: result.labels[0], base: 0, up: v, down: 0, value: v };
      const d = v - values[i - 1];
      return { label: result.labels[i], base: Math.min(v, values[i - 1]), up: d > 0 ? d : 0, down: d < 0 ? -d : 0, value: d };
    });
  }
  return (
    <Fill>
      <BarChart data={steps} margin={MARGIN} barCategoryGap="18%">
        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} minTickGap={20} tickFormatter={(v: string) => (v.length > 11 ? `${v.slice(0, 10)}…` : v)} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} />
        <Tooltip {...TOOLTIP} formatter={(_v, _n, item) => [full((item.payload as { value: number }).value, unit), result.type === "groups" ? "Adds" : "Change"]} filterNull />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} tooltipType="none" />
        <Bar dataKey="up" stackId="w" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={40} tooltipType="none" />
        <Bar dataKey="down" stackId="w" fill="var(--s-down)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </Fill>
  );
}

export function MatrixBars({ result, mode }: { result: Matrix; mode: "stacked_bars" | "grouped_bars" }) {
  const data = result.rows.map((r, i) => ({ label: r, ...Object.fromEntries(result.cols.map((c, j) => [c, result.cells[i][j]])) }));
  return (
    <Fill>
      <BarChart data={data} layout="vertical" margin={MARGIN} barCategoryGap="20%">
        <CartesianGrid stroke="var(--viz-grid)" horizontal={false} />
        <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
        <YAxis type="category" dataKey="label" tick={TICK} tickLine={false} axisLine={false} width={124} tickFormatter={(v: string) => (v.length > 19 ? `${v.slice(0, 18)}…` : v)} />
        <Tooltip {...TOOLTIP} formatter={(v) => full(Number(v), result.unit)} />
        <Legend {...LEGEND} />
        {result.cols.map((c, j) => <Bar key={c} dataKey={c} stackId={mode === "stacked_bars" ? "a" : undefined} fill={seriesColor(c, j)} stroke="var(--viz-surface)" strokeWidth={1} maxBarSize={mode === "stacked_bars" ? 22 : 10} />)}
      </BarChart>
    </Fill>
  );
}

export function ScatterView({ result }: { result: Groups }) {
  const data = result.rows.filter((r) => r.value2 != null).map((r) => ({ label: r.label, x: r.value, y: r.value2 as number }));
  return (
    <Fill>
      <ScatterChart margin={{ ...MARGIN, bottom: 14, left: 8 }}>
        <CartesianGrid stroke="var(--viz-grid)" />
        <XAxis type="number" dataKey="x" name={result.names[0]} tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} label={{ value: result.names[0], position: "insideBottom", offset: -8, fontSize: 11, fill: "var(--viz-muted)" }} />
        <YAxis type="number" dataKey="y" name={result.names[1]} tick={TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => compact(v)} label={{ value: result.names[1], angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--viz-muted)" }} />
        <ZAxis range={[90, 90]} />
        <Tooltip {...TOOLTIP} cursor={{ strokeDasharray: "3 3", stroke: "var(--viz-axis)" }} content={({ payload }) => {
          const p = payload?.[0]?.payload as { label: string; x: number; y: number } | undefined;
          return p ? (
            <div style={TOOLTIP.contentStyle} className="px-2.5 py-1.5">
              <p className="font-semibold">{p.label}</p>
              <p>{result.names[0]}: {full(p.x, result.unit)}</p>
              <p>{result.names[1]}: {full(p.y, result.unit2)}</p>
            </div>
          ) : null;
        }} />
        <Scatter data={data} fill={SERIES[0]} stroke="var(--viz-surface)" strokeWidth={2} />
      </ScatterChart>
    </Fill>
  );
}

/** Two measures per category, each on its own scale, side by side. */
export function PairBars({ result }: { result: Groups }) {
  const one = (key: "value" | "value2", name: string, unit: string, color: string, showLabels: boolean) => (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{name}</p>
      <div className="min-h-0 flex-1">
        <Fill>
          <BarChart data={result.rows.filter((r) => r[key] != null)} layout="vertical" margin={{ ...MARGIN, right: 8 }} barCategoryGap="22%">
            <CartesianGrid stroke="var(--viz-grid)" horizontal={false} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} />
            <YAxis type="category" dataKey="label" hide={!showLabels} tick={TICK} tickLine={false} axisLine={false} width={110} tickFormatter={(v: string) => (v.length > 17 ? `${v.slice(0, 16)}…` : v)} />
            <Tooltip {...TOOLTIP} formatter={(v) => [full(Number(v), unit), name]} />
            <Bar dataKey={key} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </Fill>
      </div>
    </div>
  );
  return <div className="flex h-full gap-3">{one("value", result.names[0], result.unit, SERIES[0], true)}{one("value2", result.names[1] ?? "", result.unit2 ?? "", SERIES[1], false)}</div>;
}

export function Histogram({ result }: { result: Extract<Result, { type: "hist" }> }) {
  return (
    <Fill>
      <BarChart data={result.bins} margin={MARGIN} barCategoryGap={2}>
        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
        <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compact(v)} />
        <Tooltip {...TOOLTIP} formatter={(v) => [full(Number(v)), "Records"]} labelFormatter={(l) => `${l}${result.unit ? ` ${result.unit}` : ""}`} />
        <Bar dataKey="value" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </Fill>
  );
}

export function FlowView({ result }: { result: Extract<Result, { type: "flow" }> }) {
  const from = [...new Set(result.links.map((l) => l.from))];
  const to = [...new Set(result.links.map((l) => l.to))];
  const nodes = [...from.map((name) => ({ name })), ...to.map((name) => ({ name }))];
  const links = result.links.map((l) => ({ source: from.indexOf(l.from), target: from.length + to.indexOf(l.to), value: l.value }));
  return (
    <Fill>
      <Sankey data={{ nodes, links }} nodePadding={14} nodeWidth={10} margin={{ top: 8, right: 130, bottom: 8, left: 8 }} link={{ stroke: "var(--s1)", strokeOpacity: 0.22 }}
        node={(p: { x: number; y: number; width: number; height: number; index: number; payload: { name: string; value: number } }) => (
          <g>
            <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={2} fill={p.index < from.length ? "var(--s1)" : "var(--s3)"} />
            <text x={p.index < from.length ? p.x + p.width + 6 : p.x + p.width + 6} y={p.y + p.height / 2 + 4} fontSize={11} fill="var(--viz-ink)">{p.payload.name} <tspan fill="var(--viz-muted)">{compact(p.payload.value)}</tspan></text>
          </g>
        )}>
        <Tooltip {...TOOLTIP} formatter={(v) => full(Number(v))} />
      </Sankey>
    </Fill>
  );
}

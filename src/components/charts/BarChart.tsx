"use client";

import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

interface Series {
  key: string;
  label: string;
  color: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  series: Series[];
  xKey?: string;
  stacked?: boolean;
}

export function BarChart({ data, series, xKey = "week", stacked = false }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReBarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={series.length > 2 ? 8 : 14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={45} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          labelStyle={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? "stack" : undefined} radius={[2, 2, 0, 0]} />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}

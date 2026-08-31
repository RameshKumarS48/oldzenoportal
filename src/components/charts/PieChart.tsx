"use client";

import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
}

export function PieChart({ data }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="45%"
          outerRadius="70%"
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const num = typeof value === "number" ? value : 0;
            return [`${num} (${total > 0 ? ((num / total) * 100).toFixed(1) : 0}%)`, name];
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RePieChart>
    </ResponsiveContainer>
  );
}

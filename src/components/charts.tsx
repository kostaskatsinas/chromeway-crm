"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PALETTE = ["#9a5b36", "#8a7968", "#5f7050", "#b08a3e", "#5b6b7a", "#a34a32", "#c4b49a"];

export function RevenueBar({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee8dd" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8f877c" }} axisLine={{ stroke: "#e3dcd0" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#8f877c" }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString("el-GR")} €`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e3dcd0", fontSize: 12 }}
        />
        <Bar dataKey="value" fill="#9a5b36" radius={[5, 5, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, labels }: { data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).map(([k, v]) => ({ name: labels?.[k] ?? k, value: v }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={entries} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={2} strokeWidth={0}>
          {entries.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e3dcd0", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

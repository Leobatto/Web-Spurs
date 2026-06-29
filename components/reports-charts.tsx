"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const phaseColors = ["#0f172a", "#475569", "#7c3aed", "#c2410c"];

export function ReportsCharts({
  games,
  phaseBreakdown,
}: {
  games: Array<{
    label: string;
    points: number;
    rebounds: number;
    assists: number;
  }>;
  phaseBreakdown: Array<{
    name: string;
    value: number;
  }>;
}) {
  if (games.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 p-6 text-white shadow-[0_20px_60px_rgba(9,9,11,0.28)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Producción por partido</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Puntos, rebotes y asistencias</h2>
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={games}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#a1a1aa" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a", borderRadius: 16, color: "#fafafa" }} labelStyle={{ color: "#d4d4d8" }} />
              <Legend wrapperStyle={{ color: "#fafafa" }} />
              <Line type="monotone" dataKey="points" stroke="#f59e0b" strokeWidth={3} dot={false} name="Puntos" />
              <Line type="monotone" dataKey="rebounds" stroke="#38bdf8" strokeWidth={2} dot={false} name="Rebotes" />
              <Line type="monotone" dataKey="assists" stroke="#a78bfa" strokeWidth={2} dot={false} name="Asistencias" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Distribución</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Partidos por fase</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} stroke="#71717a" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 16 }} />
                <Bar dataKey="value" fill="#111827" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 16 }} />
                <Pie data={phaseBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                  {phaseBreakdown.map((entry, index) => (
                    <Cell fill={phaseColors[index % phaseColors.length]} key={entry.name} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

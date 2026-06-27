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
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Producción por partido</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Puntos, rebotes y asistencias</h2>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="h-80 min-w-[640px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={games}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis stroke="#71717a" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="points" stroke="#111827" strokeWidth={3} dot={false} name="Puntos" />
                <Line type="monotone" dataKey="rebounds" stroke="#7c3aed" strokeWidth={2} dot={false} name="Rebotes" />
                <Line type="monotone" dataKey="assists" stroke="#c2410c" strokeWidth={2} dot={false} name="Asistencias" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Distribución</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Partidos por fase</h2>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="h-80 min-w-[540px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} stroke="#71717a" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#111827" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="h-72 min-w-[540px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie data={phaseBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
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

import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Reportes</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Comparativas</h1>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-zinc-600">Los gráficos con Recharts se conectan cuando existan partidos guardados.</p>
      </div>
    </div>
  );
}

import { requireUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireUser();

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Jugador</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Mis estadísticas</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Perfil" value={user.onboarded ? "Completo" : "Pendiente"} />
        <StatCard label="Categoría" value="Total" helper="Filtro PM/M pendiente de datos" />
        <StatCard label="Reportes" value={user.emailReports ? "Email sí" : "Email no"} />
      </div>
    </div>
  );
}

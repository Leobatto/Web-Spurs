import { requireAppUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await requireAppUser();

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Mi perfil</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Mi tablero personal</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Perfil" value={user.onboarded ? "Listo" : "Pendiente"} helper="Ficha del plantel" />
        <StatCard label="Corte" value="Total" helper="Más adelante sumará +30 y +40" />
        <StatCard label="Reportes" value={user.emailReports ? "Activados" : "Desactivados"} helper="Avisos por mail" />
      </div>
    </div>
  );
}

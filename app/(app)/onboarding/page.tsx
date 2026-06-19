import { asc } from "drizzle-orm";
import { completeOnboarding } from "@/app/actions/onboarding";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireUser();
  const roster = await db.select().from(players).orderBy(asc(players.name), asc(players.lastName));

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Primer ingreso</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Completá tu perfil</h1>
      <form action={completeOnboarding} className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-zinc-700">
          Elegí tu ficha del plantel
          <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="playerId" required>
            <option value="">Seleccionar</option>
            {roster.map((player) => (
              <option key={player.id} value={player.id}>{player.name}{player.lastName ? ` ${player.lastName}` : ""}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Celular
          <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="phone" required />
        </label>
        <label className="mt-5 flex items-center gap-3 text-sm font-medium text-zinc-700">
          <input defaultChecked name="emailReports" type="checkbox" />
          Recibir reportes por email
        </label>
        <button className="mt-6 rounded-xl bg-zinc-950 px-5 py-3 font-semibold text-white" type="submit">
          Guardar perfil
        </button>
      </form>
    </div>
  );
}

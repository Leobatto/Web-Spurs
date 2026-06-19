import { asc, desc, eq } from "drizzle-orm";
import { createPlayer } from "@/app/actions/roster";
import { RosterManager } from "@/components/roster-manager";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function messageText(message?: string) {
  if (message === "players-unified") return "Jugadores unificados correctamente.";
  if (message === "player-deleted") return "Jugador eliminado del plantel.";
  if (message === "same-player") return "Elegí dos jugadores distintos para unificar.";
  if (message === "select-multiple") return "Seleccioná al menos dos jugadores para unificar.";
  return null;
}

function sortOrder(sort?: string) {
  if (sort === "name-desc") return desc(players.name);
  if (sort === "jersey-asc") return asc(players.jerseyNumber);
  if (sort === "jersey-desc") return desc(players.jerseyNumber);
  return asc(players.name);
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; sort?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  const message = messageText(params.message);
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.ownerUserId, user.id))
    .orderBy(sortOrder(params.sort), asc(players.name));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Plantel</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Jugadores</h1>
        {message ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {message}
          </p>
        ) : null}
        <RosterManager activeSort={params.sort ?? "name-asc"} roster={roster} />
      </section>
      <aside className="grid h-fit gap-6">
        <form action={createPlayer} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Alta rápida</h2>
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Nombre
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="name" required />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Apellido
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="lastName" />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Número
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="jerseyNumber" type="number" min="0" max="99" />
          </label>
          <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
            Crear jugador
          </button>
        </form>
      </aside>
    </div>
  );
}

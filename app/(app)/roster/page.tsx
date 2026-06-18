import { asc, eq } from "drizzle-orm";
import { createPlayer } from "@/app/actions/roster";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const user = await requireAdmin();
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.ownerUserId, user.id))
    .orderBy(asc(players.name));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Plantel</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Jugadores</h1>
        <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {roster.length === 0 ? (
            <p className="p-6 text-zinc-500">Todavía no hay jugadores cargados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Nro.</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((player) => (
                  <tr className="border-t border-zinc-100" key={player.id}>
                    <td className="px-5 py-4 font-medium">{player.name}</td>
                    <td className="px-5 py-4 text-zinc-500">{player.jerseyNumber ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <form action={createPlayer} className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Alta rápida</h2>
        <label className="mt-5 block text-sm font-medium text-zinc-700">
          Nombre
          <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="name" required />
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Número
          <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="jerseyNumber" type="number" min="0" max="99" />
        </label>
        <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
          Crear jugador
        </button>
      </form>
    </div>
  );
}

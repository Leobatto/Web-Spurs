import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  createPlayer,
  deletePlayer,
  unifyPlayers,
  updatePlayer,
} from "@/app/actions/roster";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function messageText(message?: string) {
  if (message === "players-unified") return "Jugadores unificados correctamente.";
  if (message === "player-deleted") return "Jugador eliminado del plantel.";
  if (message === "same-player") return "Elegí dos jugadores distintos para unificar.";
  return null;
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  const message = messageText(params.message);
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.ownerUserId, user.id))
    .orderBy(asc(players.name));

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
        <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          {roster.length === 0 ? (
            <p className="p-6 text-zinc-500">Todavía no hay jugadores cargados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Nro.</th>
                  <th className="px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((player) => (
                  <tr className="border-t border-zinc-100" key={player.id}>
                    <td className="px-5 py-4 align-top">
                      <form action={updatePlayer} className="grid gap-2 sm:grid-cols-[1fr_92px_auto]">
                        <input name="playerId" type="hidden" value={player.id} />
                        <input
                          className="rounded-xl border border-zinc-200 px-3 py-2 font-medium"
                          defaultValue={player.name}
                          name="name"
                          required
                        />
                        <input
                          className="rounded-xl border border-zinc-200 px-3 py-2"
                          defaultValue={player.jerseyNumber ?? ""}
                          name="jerseyNumber"
                          type="number"
                          min="0"
                          max="99"
                        />
                        <button className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold" type="submit">
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-5 py-4 align-top text-zinc-500">{player.jerseyNumber ?? "-"}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white" href={`/players/${player.id}`}>
                          Estadísticas
                        </Link>
                        <form action={deletePlayer}>
                          <input name="playerId" type="hidden" value={player.id} />
                          <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                            Eliminar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <aside className="grid h-fit gap-6">
        <form action={createPlayer} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
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
        <form action={unifyPlayers} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Vincular / unificar</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Mueve estadísticas y cuentas vinculadas desde el jugador duplicado hacia la ficha correcta.
          </p>
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Duplicado / origen
            <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="sourcePlayerId" required>
              <option value="">Seleccionar</option>
              {roster.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Ficha correcta / destino
            <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="targetPlayerId" required>
              <option value="">Seleccionar</option>
              {roster.map((player) => (
                <option key={player.id} value={player.id}>{player.name}</option>
              ))}
            </select>
          </label>
          <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
            Unificar jugadores
          </button>
        </form>
      </aside>
    </div>
  );
}

import { asc, desc, eq } from "drizzle-orm";
import { createPlayer } from "@/app/actions/roster";
import { RosterManager } from "@/components/roster-manager";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getDashboardOwnerUserId, requireAppUser } from "@/lib/auth";

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
  if (sort === "lastName-asc") return asc(players.lastName);
  if (sort === "lastName-desc") return desc(players.lastName);
  if (sort === "jersey-asc") return asc(players.jerseyNumber);
  if (sort === "jersey-desc") return desc(players.jerseyNumber);
  return asc(players.lastName);
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; sort?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const message = messageText(params.message);
  const ownerId = await getDashboardOwnerUserId(user.id, user.role);
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.ownerUserId, ownerId))
    .orderBy(sortOrder(params.sort), asc(players.name));

  if (user.role === "read") {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Plantel</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Jugadores</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Vista de solo lectura del plantel. Podés abrir cada ficha, pero no crear, editar ni eliminar jugadores.</p>
        </section>
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-3">Jugador</th>
                <th className="px-5 py-3">Apellido</th>
                <th className="px-5 py-3">Nro.</th>
                <th className="px-5 py-3">Ficha</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player) => (
                <tr className="border-t border-zinc-100" key={player.id}>
                  <td className="px-5 py-4 font-medium">{player.name}</td>
                  <td className="px-5 py-4 text-zinc-500">{player.lastName ?? "-"}</td>
                  <td className="px-5 py-4 text-zinc-500">{player.jerseyNumber ?? "-"}</td>
                  <td className="px-5 py-4">
                    <a className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white" href={`/players/${player.id}`}>
                      Ver stats
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  }

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
        <RosterManager activeSort={params.sort ?? "lastName-asc"} roster={roster} />
      </section>
      <aside className="grid h-fit gap-6">
        <form action={createPlayer} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm" encType="multipart/form-data">
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
            Apodo
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="nickname" />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Número
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="jerseyNumber" type="number" min="0" max="99" />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Foto
            <input className="mt-2 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3" accept="image/*" name="photo" type="file" />
          </label>
          <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
            Crear jugador
          </button>
        </form>
      </aside>
    </div>
  );
}

import { and, asc, desc, eq } from "drizzle-orm";
import { createTournament } from "@/app/actions/tournaments";
import { updateImportTags } from "@/app/actions/import";
import { resolvePlayerMatch } from "@/app/actions/player-matches";
import { db } from "@/db";
import { imports, playerMatchReviews, players, tournaments } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { gamePhases } from "@/lib/game-phases";
import { getOrCreateDefaultTournaments } from "@/lib/tournaments";
import { formatPlayerDisplayName } from "@/lib/player-name";
import { ImportUploadForm } from "@/components/import-upload-form";

export const dynamic = "force-dynamic";

function importMessage(code?: string, fileName?: string) {
  if (code === "imports-reset") {
    return "Se borraron todos los partidos, importaciones, jugadores y revisiones de importación. Ya podés empezar de cero.";
  }

  if (code === "duplicate") {
    return `El PDF ${fileName ? `"${fileName}" ` : ""}ya fue importado. No se volvió a analizar para evitar duplicados.`;
  }

  if (code === "imports-processed") {
    return "Los archivos se procesaron correctamente.";
  }

  if (code === "tournament-created") {
    return "Torneo creado correctamente.";
  }

  if (code === "tournament-exists") {
    return "Ese torneo ya existe.";
  }

  if (code === "import-updated") {
    return "El torneo y la fase de la importación se actualizaron correctamente.";
  }

  if (code === "not-found") {
    return "No se encontró la importación para actualizar.";
  }

  return null;
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; file?: string; processed?: string; duplicates?: string; failed?: string }>;
}) {
  const user = await requireAppUser();
  const canEdit = user.role !== "read";
  const params = await searchParams;
  const flashCode = params.message ?? params.error;
  const message = importMessage(flashCode, params.file);
  const tournamentRows = canEdit
    ? await getOrCreateDefaultTournaments(user.id)
    : await db.select().from(tournaments).where(eq(tournaments.ownerUserId, user.id));
  const rosterRows = await db
    .select()
    .from(players)
    .where(eq(players.ownerUserId, user.id))
    .orderBy(asc(players.lastName), asc(players.name));
  const rows = await db
    .select({ row: imports, tournamentName: tournaments.name })
    .from(imports)
    .leftJoin(tournaments, eq(imports.tournamentId, tournaments.id))
    .where(eq(imports.ownerUserId, user.id))
    .orderBy(desc(imports.createdAt));
  const pendingMatches = await db
    .select({ match: playerMatchReviews, suggestedPlayer: players })
    .from(playerMatchReviews)
    .leftJoin(players, eq(playerMatchReviews.suggestedPlayerId, players.id))
    .where(
      and(
        eq(playerMatchReviews.ownerUserId, user.id),
        eq(playerMatchReviews.status, "pending"),
      ),
    );
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Subir estadística en PDF</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Carga guiada de PDFs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          Subí planillas una sola vez, revisá duplicados antes de enviar y mantené torneos e importaciones ordenados desde un mismo lugar.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Importaciones</p>
          <p className="mt-2 text-4xl font-black">{rows.length}</p>
          <p className="mt-2 text-sm text-zinc-500">Histórico cargado</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Pendientes</p>
          <p className="mt-2 text-4xl font-black">{pendingMatches.length}</p>
          <p className="mt-2 text-sm text-zinc-500">Revisiones de jugadores</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Torneos</p>
          <p className="mt-2 text-4xl font-black">{tournamentRows.length}</p>
          <p className="mt-2 text-sm text-zinc-500">Listos para clasificar</p>
        </div>
      </div>

      {canEdit && pendingMatches.length > 0 ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(720px,calc(100%-2rem))] rounded-3xl border border-amber-200 bg-white p-0 shadow-2xl backdrop:bg-black/40">
          <div className="border-b border-zinc-100 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">Revisión requerida</p>
            <h2 className="mt-2 text-2xl font-black">Coincidencias dudosas de jugadores</h2>
            <p className="mt-2 text-sm text-zinc-600">
              La IA detectó nombres parecidos a jugadores existentes. Confirmá si corresponde vincularlos o crear una ficha nueva.
            </p>
          </div>
          <div className="grid max-h-[70vh] gap-3 overflow-auto p-6">
            {pendingMatches.map(({ match, suggestedPlayer }) => (
              <div className="rounded-2xl border border-zinc-200 p-4" key={match.id}>
                <p className="font-semibold">PDF: {match.rawName}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Sugerencia: {suggestedPlayer ? formatPlayerDisplayName(suggestedPlayer) : match.suggestedPlayerName ?? "sin sugerencia"} ({match.confidence}%)
                </p>
                <div className="mt-4 grid gap-4">
                  {match.suggestedPlayerId ? (
                    <form action={resolvePlayerMatch} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <input name="matchId" type="hidden" value={match.id} />
                      <input name="mode" type="hidden" value="suggested" />
                      <p className="text-sm font-semibold text-zinc-700">Aceptar la sugerencia automática</p>
                      <button className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                        Vincular sugerido
                      </button>
                    </form>
                  ) : null}

                  <form action={resolvePlayerMatch} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="mode" type="hidden" value="existing" />
                    <label className="block text-sm font-medium text-zinc-700">
                      Elegir otro jugador
                      <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={match.suggestedPlayerId ?? ""} name="playerId" required>
                        <option value="">Seleccionar</option>
                        {rosterRows.map((player) => (
                          <option key={player.id} value={player.id}>
                            {formatPlayerDisplayName(player)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="mt-3 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold" type="submit">
                      Vincular elegido
                    </button>
                  </form>

                  <form action={resolvePlayerMatch} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="mode" type="hidden" value="new" />
                    <p className="text-sm font-semibold text-zinc-700">Crear jugador nuevo y guardar sus datos</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-zinc-700">
                        Nombre
                        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={match.rawName} name="name" required />
                      </label>
                      <label className="block text-sm font-medium text-zinc-700">
                        Apellido
                        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="lastName" />
                      </label>
                      <label className="block text-sm font-medium text-zinc-700">
                        Apodo
                        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="nickname" />
                      </label>
                      <label className="block text-sm font-medium text-zinc-700">
                        Número
                        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" min="0" max="99" name="jerseyNumber" type="number" />
                      </label>
                    </div>
                    <button className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                      Crear y vincular
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </dialog>
      ) : null}
      {params.message === "imports-processed" ? (
        <p className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Procesados: {params.processed ?? "0"} · Duplicados: {params.duplicates ?? "0"} · Fallidos: {params.failed ?? "0"}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {message}
        </p>
      ) : null}
      <div className={canEdit ? "grid gap-6 lg:grid-cols-[420px_1fr]" : "grid gap-6"}>
        {canEdit ? (
          <ImportUploadForm defaultTournamentId={tournamentRows[0]?.id ?? ""} phaseOptions={gamePhases} tournamentOptions={tournamentRows} />
        ) : (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Solo lectura</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Importaciones visibles</h2>
            <p className="mt-2 text-sm text-zinc-600">Este perfil puede revisar importaciones, pero no subir PDFs ni guardar cambios.</p>
          </section>
        )}

        <div className="space-y-6">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Paso 2</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Torneos</h2>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">Organización</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">Creá temporadas nuevas y reasigná importaciones existentes sin tocar las planillas subidas.</p>
            {canEdit ? (
              <form action={createTournament} className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                <label className="block text-sm font-medium text-zinc-700">
                  Nuevo torneo
                  <input className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" name="name" placeholder="2026 - Torneo Clausura" required />
                </label>
                <button className="mt-4 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800" type="submit">
                  Crear torneo
                </button>
              </form>
            ) : null}
            <div className="mt-5 grid gap-2">
              {tournamentRows.map((tournament) => (
                <div className="rounded-2xl border border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700" key={tournament.id}>
                  {tournament.name}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Paso 3</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Últimas importaciones</h2>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">{rows.length} registros</span>
            </div>
            <div className="mt-5 grid gap-3">
              {rows.length === 0 ? <p className="text-zinc-500">No hay importaciones todavía.</p> : null}
              {rows.map(({ row, tournamentName }) => {
                const selectedTournamentId = row.tournamentId ?? tournamentRows[0]?.id ?? "";

                return (
                  <article className="rounded-2xl border border-zinc-100 p-4" key={row.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.fileName}</p>
                        <p className="text-sm text-zinc-500">Estado: {row.status}</p>
                        <p className="text-xs text-zinc-400">Torneo: {tournamentName ?? "sin torneo"}</p>
                      </div>
                      {row.unresolvedMatches > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {row.unresolvedMatches} dudas
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          tags listos
                        </span>
                      )}
                    </div>
                    {canEdit ? (
                      <form action={updateImportTags} className="mt-4 grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_auto]">
                        <input name="importId" type="hidden" value={row.id} />
                        <label className="block text-sm font-medium text-zinc-700">
                          Torneo
                          <select className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue={selectedTournamentId} name="tournamentId" required>
                            {tournamentRows.map((tournament) => (
                              <option key={tournament.id} value={tournament.id}>
                                {tournament.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-zinc-700">
                          Fase
                          <select className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue="regular" name="phase" required>
                            {gamePhases.map((phase) => (
                              <option key={phase.value} value={phase.value}>
                                {phase.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="self-end rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800" type="submit">
                          Guardar tags
                        </button>
                      </form>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

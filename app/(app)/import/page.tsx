import { and, desc, eq, inArray } from "drizzle-orm";
import { createTournament } from "@/app/actions/tournaments";
import { registerImport, updateImportTags } from "@/app/actions/import";
import { resolvePlayerMatch } from "@/app/actions/player-matches";
import { db } from "@/db";
import { games, imports, playerGameStats, playerMatchReviews, players, tournaments } from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import { formatGamePhase, gamePhases } from "@/lib/game-phases";
import { getOrCreateDefaultTournaments } from "@/lib/tournaments";
import { formatPlayerDisplayName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

function importMessage(code?: string, fileName?: string) {
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

function formatGameDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; file?: string; processed?: string; duplicates?: string; failed?: string }>;
}) {
  const user = await requireWrite();
  const params = await searchParams;
  const flashCode = params.message ?? params.error;
  const message = importMessage(flashCode, params.file);
  const tournamentRows = await getOrCreateDefaultTournaments(user.id);
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
  const gameIds = rows.map(({ row }) => row.gameId).filter((gameId): gameId is string => Boolean(gameId));
  const gamesById = new Map<string, typeof games.$inferSelect>();
  const statsByGameId = new Map<string, Array<{ stat: typeof playerGameStats.$inferSelect; player: typeof players.$inferSelect }>>();

  if (gameIds.length > 0) {
    const gameRows = await db.select().from(games).where(inArray(games.id, gameIds));
    for (const game of gameRows) {
      gamesById.set(game.id, game);
    }

    const statRows = await db
      .select({ stat: playerGameStats, player: players })
      .from(playerGameStats)
      .innerJoin(players, eq(playerGameStats.playerId, players.id))
      .where(inArray(playerGameStats.gameId, gameIds))
      .orderBy(desc(playerGameStats.points));

    for (const row of statRows) {
      const items = statsByGameId.get(row.stat.gameId) ?? [];
      items.push(row);
      statsByGameId.set(row.stat.gameId, items);
    }
  }

  return (
    <div>
      {pendingMatches.length > 0 ? (
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
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {match.suggestedPlayerId ? (
                    <form action={resolvePlayerMatch}>
                      <input name="matchId" type="hidden" value={match.id} />
                      <input name="mode" type="hidden" value="suggested" />
                      <button className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                        Vincular sugerido
                      </button>
                    </form>
                  ) : null}
                  <form action={resolvePlayerMatch}>
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="mode" type="hidden" value="new" />
                    <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold" type="submit">
                      Crear jugador nuevo
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </dialog>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Planillas</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Importar PDF</h1>
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
      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <form action={registerImport} className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Subir planilla</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Subí uno o varios PDFs, elegí el torneo y el sistema los procesa por separado.
          </p>
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Torneo
            <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={tournamentRows[0]?.id ?? ""} name="tournamentId" required>
              <option value="">Seleccionar torneo</option>
              {tournamentRows.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Fase
            <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue="regular" name="phase" required>
              {gamePhases.map((phase) => (
                <option key={phase.value} value={phase.value}>
                  {phase.label}
                </option>
              ))}
            </select>
          </label>
          <input accept="application/pdf" className="mt-5 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4" multiple name="pdfs" type="file" required />
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Video de YouTube del partido
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
              name="youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
          </label>
          <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
            Registrar importación
          </button>
        </form>
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Torneos</h2>
          <p className="mt-2 text-sm text-zinc-500">Creá torneos nuevos y mantené las importaciones organizadas por temporada.</p>
          <form action={createTournament} className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <label className="block text-sm font-medium text-zinc-700">
              Nuevo torneo
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="name" placeholder="2026 - Torneo Clausura" required />
            </label>
            <button className="mt-4 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
              Crear torneo
            </button>
          </form>
          <div className="mt-5 grid gap-2">
            {tournamentRows.map((tournament) => (
              <div className="rounded-2xl border border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700" key={tournament.id}>
                {tournament.name}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Últimas importaciones</h2>
          <div className="mt-5 grid gap-3">
            {rows.length === 0 ? <p className="text-zinc-500">No hay importaciones todavía.</p> : null}
            {rows.map(({ row, tournamentName }) => {
              const game = row.gameId ? gamesById.get(row.gameId) : null;
              const gameStats = game?.id ? statsByGameId.get(game.id) ?? [] : [];
              const selectedTournamentId = row.tournamentId ?? tournamentRows[0]?.id ?? "";
              const selectedPhase = game?.phase ?? "regular";

              return (
                <details className="rounded-2xl border border-zinc-100 p-4" key={row.id}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{row.fileName}</p>
                      <p className="text-sm text-zinc-500">Estado: {row.status}</p>
                      <p className="text-xs text-zinc-400">Torneo: {tournamentName ?? "sin torneo"}</p>
                      {game ? <p className="text-xs text-zinc-400">Fase: {formatGamePhase(game.phase)}</p> : null}
                    </div>
                    {row.unresolvedMatches > 0 ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        {row.unresolvedMatches} dudas
                      </span>
                    ) : null}
                  </summary>
                  <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
                    <form action={updateImportTags} className="grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_auto]">
                      <input name="importId" type="hidden" value={row.id} />
                      <label className="block text-sm font-medium text-zinc-700">
                        Torneo
                        <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={selectedTournamentId} name="tournamentId" required>
                          {tournamentRows.map((tournament) => (
                            <option key={tournament.id} value={tournament.id}>
                              {tournament.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-zinc-700">
                        Fase
                        <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={selectedPhase} name="phase" required>
                          {gamePhases.map((phase) => (
                            <option key={phase.value} value={phase.value}>
                              {phase.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="self-end rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
                        Guardar tags
                      </button>
                    </form>

                    {game ? (
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Partido cargado</p>
                        <p className="mt-2 font-semibold text-zinc-950">
                          Spurs vs {game.opponent} · {game.category === "PM" ? "+30" : "+40"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{formatGamePhase(game.phase)}</p>
                        <p className="mt-1 text-sm text-zinc-500">{formatGameDate(game.date)}</p>
                        {game.finalScore ? <p className="mt-2 text-sm font-medium text-zinc-700">{game.finalScore}</p> : null}
                        {game.youtubeUrl ? (
                          <a className="mt-2 inline-flex text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" href={game.youtubeUrl} target="_blank">
                            Ver video
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {gameStats.length > 0 ? (
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Jugadores cargados</p>
                        <div className="mt-3 grid gap-2">
                          {gameStats.map(({ stat, player }) => (
                            <div className="flex items-center justify-between rounded-2xl border border-zinc-100 px-4 py-3" key={stat.id}>
                              <div>
                                <p className="font-semibold text-zinc-950">{formatPlayerDisplayName(player)}</p>
                                <p className="text-xs text-zinc-500">#{player.jerseyNumber ?? "-"}</p>
                              </div>
                              <p className="text-sm font-semibold text-zinc-700">{stat.points} pts · {stat.assists} ast · {stat.defReb + stat.offReb} reb</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {row.analysisSummary ? (
                      <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">{row.analysisSummary}</p>
                    ) : null}
                    {row.error ? (
                      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{row.error}</p>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

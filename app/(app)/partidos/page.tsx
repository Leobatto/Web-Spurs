import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats, players, tournaments } from "@/db/schema";
import { StatCard } from "@/components/stat-card";
import { DeleteGameButton } from "@/components/delete-game-button";
import { requireAppUser } from "@/lib/auth";
import { GameFilters } from "@/components/game-filters";
import { formatGameCategory } from "@/lib/game-categories";
import { formatGamePhase } from "@/lib/game-phases";
import { gameCategoryOptions } from "@/lib/game-categories";
import { deleteGameDetails, updateGameDetails } from "@/app/actions/games";

export const dynamic = "force-dynamic";

type PreviewStats = {
  players: number;
  points: number;
  rebounds: number;
  assists: number;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; phase?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const [allGames, statRows, playerRows, tournamentRows] = await Promise.all([
    db.select().from(games).where(eq(games.ownerUserId, user.id)),
    db
      .select({ gameId: playerGameStats.gameId, stat: playerGameStats })
      .from(playerGameStats)
      .innerJoin(games, eq(playerGameStats.gameId, games.id))
      .where(eq(games.ownerUserId, user.id)),
    db.select().from(players).where(eq(players.ownerUserId, user.id)),
    user.role === "admin"
      ? db.select().from(tournaments).where(eq(tournaments.ownerUserId, user.id))
      : Promise.resolve([]),
  ]);

  const opponents = Array.from(new Set(allGames.map((game) => game.opponent))).sort((a, b) => a.localeCompare(b));
  const filteredGames = allGames
    .filter((game) => {
      if (params.opponent && game.opponent !== params.opponent) {
        return false;
      }

      if (params.phase && game.phase !== params.phase) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const now = new Date();
  const previewByGame = new Map<string, PreviewStats>();
  for (const row of statRows) {
    const current = previewByGame.get(row.gameId) ?? { players: 0, points: 0, rebounds: 0, assists: 0 };
    current.players += 1;
    current.points += row.stat.points;
    current.rebounds += row.stat.offReb + row.stat.defReb;
    current.assists += row.stat.assists;
    previewByGame.set(row.gameId, current);
  }

  const playedGames = allGames.filter((game) => game.date < now).length;
  const upcomingGames = allGames.length - playedGames;
  const activePlayers = playerRows.length;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Análisis</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Partidos</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">
        Revisá cada partido de forma individual, con acceso al box score, resumen y detalle por jugador.
      </p>

      <GameFilters opponents={opponents} selectedOpponent={params.opponent} selectedPhase={params.phase} />

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Partidos" value={allGames.length} helper="Cargados en el sistema" />
        <StatCard label="Jugados" value={playedGames} helper="Con fecha pasada" />
        <StatCard label="Próximos" value={upcomingGames} helper="Pendientes" />
        <StatCard label="Jugadores" value={activePlayers} helper="En el plantel" />
      </div>

      {filteredGames.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No hay partidos para ese filtro.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {filteredGames.map((game) => {
            const preview = previewByGame.get(game.id) ?? { players: 0, points: 0, rebounds: 0, assists: 0 };

            return (
              <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm" key={game.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
                      {formatGameCategory(game.category)} · {formatGamePhase(game.phase)}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Spurs vs {game.opponent}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{formatDate(game.date)}</p>
                    <p className="mt-1 text-sm text-zinc-500">{game.isHome ? "Local" : "Visitante"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${game.date < now ? "bg-zinc-100 text-zinc-700" : "bg-amber-100 text-amber-800"}`}>
                    {game.date < now ? "Jugado" : "Próximo"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Jugadores</p>
                    <p className="mt-1 text-2xl font-black">{preview.players}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">PTS</p>
                    <p className="mt-1 text-2xl font-black">{preview.points}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">REB</p>
                    <p className="mt-1 text-2xl font-black">{preview.rebounds}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">AST</p>
                    <p className="mt-1 text-2xl font-black">{preview.assists}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-500">{game.finalScore ?? "Resultado pendiente"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" href={`/partidos/${game.id}`}>
                      Ver análisis
                    </Link>
                    {user.role === "admin" ? (
                      <form action={deleteGameDetails}>
                        <input name="gameId" type="hidden" value={game.id} />
                        <DeleteGameButton />
                      </form>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
                  {game.youtubeUrl ? <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Video disponible</span> : null}
                  {game.tournamentId ? <span className="rounded-full bg-zinc-100 px-3 py-1">Torneo asignado</span> : null}
                </div>

                {user.role === "admin" ? (
                  <form action={updateGameDetails} className="mt-4 grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <input name="gameId" type="hidden" value={game.id} />
                    <input name="date" type="hidden" value={game.date.toISOString()} />
                    <label className="block text-sm font-medium text-zinc-700">
                      Categoría
                      <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={game.category} name="category" required>
                        {gameCategoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-zinc-700">
                      Fase
                      <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={game.phase} name="phase" required>
                        <option value="regular">Fase regular</option>
                        <option value="quarterfinal">Cuartos de final</option>
                        <option value="semifinal">Semifinal</option>
                        <option value="final">Final</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-zinc-700">
                      Torneo
                      <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={game.tournamentId ?? ""} name="tournamentId">
                        <option value="">Sin torneo</option>
                        {tournamentRows.map((tournament) => (
                          <option key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="self-end rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
                      Guardar tags
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

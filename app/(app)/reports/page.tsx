import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { GameFilters } from "@/components/game-filters";
import { ReportsCharts } from "@/components/reports-charts";
import { formatGamePhase, gamePhases } from "@/lib/game-phases";
import { formatPlayerDisplayName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; phase?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [allGames, statRows] = await Promise.all([
    db.select().from(games).where(eq(games.ownerUserId, user.id)),
    db.select({ game: games, stat: playerGameStats, player: players }).from(playerGameStats).innerJoin(players, eq(playerGameStats.playerId, players.id)).innerJoin(games, eq(playerGameStats.gameId, games.id)).where(eq(games.ownerUserId, user.id)),
  ]);

  const opponents = Array.from(new Set(allGames.map((game) => game.opponent))).sort((a, b) => a.localeCompare(b));
  const filteredGames = allGames.filter((game) => {
    if (params.opponent && game.opponent !== params.opponent) {
      return false;
    }

    if (params.phase && game.phase !== params.phase) {
      return false;
    }

    return true;
  });
  const filteredGameIds = new Set(filteredGames.map((game) => game.id));
  const filteredStatRows = statRows.filter((row) => filteredGameIds.has(row.game.id));

  const gameSeries = filteredGames
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((game) => {
      const rows = filteredStatRows.filter((row) => row.game.id === game.id);
      const points = rows.reduce((sum, row) => sum + row.stat.points, 0);
      const rebounds = rows.reduce((sum, row) => sum + row.stat.offReb + row.stat.defReb, 0);
      const assists = rows.reduce((sum, row) => sum + row.stat.assists, 0);

      return {
        label: `${formatDate(game.date)} · ${game.opponent}`,
        points,
        rebounds,
        assists,
      };
    })
    ;

  const phaseBreakdown = gamePhases.map((phase) => ({
    name: phase.label,
    value: filteredGames.filter((game) => game.phase === phase.value).length,
  }));

  const scorerMap = filteredStatRows.reduce((acc, row) => {
    const current = acc.get(row.player.id) ?? { player: row.player, points: 0, rebounds: 0, assists: 0, games: 0 };
    current.points += row.stat.points;
    current.rebounds += row.stat.offReb + row.stat.defReb;
    current.assists += row.stat.assists;
    current.games += 1;
    acc.set(row.player.id, current);
    return acc;
  }, new Map<string, { player: typeof filteredStatRows[number]["player"]; points: number; rebounds: number; assists: number; games: number }>());

  const topScorers = Array.from(scorerMap.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Reportes</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Comparativas</h1>
      <GameFilters opponents={opponents} selectedOpponent={params.opponent} selectedPhase={params.phase} />
      {(params.opponent || params.phase) ? (
        <p className="mt-4 text-sm text-zinc-500">
          Filtro activo: {params.opponent ? `vs ${params.opponent}` : "todos los rivales"} · {params.phase ? formatGamePhase(params.phase) : "todas las fases"}
        </p>
      ) : null}

      {filteredGames.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No hay partidos para ese filtro.
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Partidos</p>
              <p className="mt-2 text-4xl font-black">{filteredGames.length}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Jugadores activos</p>
              <p className="mt-2 text-4xl font-black">{new Set(filteredStatRows.map((row) => row.player.id)).size}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Puntos totales</p>
              <p className="mt-2 text-4xl font-black">{filteredStatRows.reduce((sum, row) => sum + row.stat.points, 0)}</p>
            </div>
          </div>

          <div className="mt-8">
            <ReportsCharts games={gameSeries} phaseBreakdown={phaseBreakdown} />
          </div>

          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Top 5</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Jugadores destacados</h2>
            <div className="mt-5 grid gap-3">
              {topScorers.map((totals, index) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-100 px-4 py-3" key={totals.player.id}>
                  <div>
                    <p className="text-xs font-bold text-zinc-400">#{index + 1}</p>
                    <p className="font-semibold text-zinc-950">{formatPlayerDisplayName(totals.player)}</p>
                    <p className="text-xs text-zinc-500">{totals.games} partidos</p>
                  </div>
                  <div className="text-right text-sm font-semibold text-zinc-700">
                    <p>{totals.points} pts</p>
                    <p>{totals.rebounds} reb · {totals.assists} ast</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Partidos</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Detalle del filtro</h2>
            <div className="mt-5 grid gap-3">
              {filteredGames.map((game) => (
                <div className="rounded-2xl border border-zinc-100 px-4 py-3" key={game.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">Spurs vs {game.opponent}</p>
                      <p className="text-sm text-zinc-500">{formatDate(game.date)} · {formatGamePhase(game.phase)}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">{game.category === "PM" ? "+30" : "+40"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

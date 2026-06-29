import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { GameFilters } from "@/components/game-filters";
import { ReportsCharts } from "@/components/reports-charts";
import { formatGamePhase, gamePhases } from "@/lib/game-phases";
import { formatPlayerDisplayName } from "@/lib/player-name";
import { formatGameCategory, gameCategoryOptions } from "@/lib/game-categories";

export const dynamic = "force-dynamic";

type CategoryKey = (typeof gameCategoryOptions)[number]["value"];

type PlayerAggregate = {
  player: typeof players.$inferSelect;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
  fgMade: number;
  fgAtt: number;
  twoMade: number;
  twoAtt: number;
  threeMade: number;
  threeAtt: number;
  ftMade: number;
  ftAtt: number;
};

type CategoryBuckets = Record<CategoryKey, Map<string, PlayerAggregate>>;

type ShootingRow = {
  player: typeof players.$inferSelect;
  made: number;
  attempted: number;
  pct: number;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function percent(made: number, attempted: number) {
  return attempted === 0 ? 0 : (made / attempted) * 100;
}

function emptyAggregate(player: typeof players.$inferSelect): PlayerAggregate {
  return {
    player,
    games: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
    fgMade: 0,
    fgAtt: 0,
    twoMade: 0,
    twoAtt: 0,
    threeMade: 0,
    threeAtt: 0,
    ftMade: 0,
    ftAtt: 0,
  };
}

function emptyBuckets(): CategoryBuckets {
  return {
    PM: new Map<string, PlayerAggregate>(),
    M: new Map<string, PlayerAggregate>(),
    U: new Map<string, PlayerAggregate>(),
  };
}

function addAggregate(bucket: Map<string, PlayerAggregate>, input: { player: typeof players.$inferSelect; stat: typeof playerGameStats.$inferSelect }) {
  const current = bucket.get(input.player.id) ?? emptyAggregate(input.player);

  current.games += 1;
  current.points += input.stat.points;
  current.rebounds += input.stat.offReb + input.stat.defReb;
  current.assists += input.stat.assists;
  current.fgMade += input.stat.fgMade;
  current.fgAtt += input.stat.fgAtt;
  current.twoMade += input.stat.twoMade;
  current.twoAtt += input.stat.twoAtt;
  current.threeMade += input.stat.threeMade;
  current.threeAtt += input.stat.threeAtt;
  current.ftMade += input.stat.ftMade;
  current.ftAtt += input.stat.ftAtt;
  bucket.set(input.player.id, current);
}

function topPlayers(bucket: Map<string, PlayerAggregate>) {
  return [...bucket.values()].sort((a, b) => b.points - a.points || b.rebounds - a.rebounds || b.assists - a.assists).slice(0, 5);
}

function topShooters(
  rows: Array<{ player: typeof players.$inferSelect; stat: typeof playerGameStats.$inferSelect }>,
  key: "two" | "three" | "ft",
) {
  const bucket = new Map<string, ShootingRow>();

  for (const row of rows) {
    const made = key === "two" ? row.stat.twoMade : key === "three" ? row.stat.threeMade : row.stat.ftMade;
    const attempted = key === "two" ? row.stat.twoAtt : key === "three" ? row.stat.threeAtt : row.stat.ftAtt;
    const current = bucket.get(row.player.id) ?? { player: row.player, made: 0, attempted: 0, pct: 0 };

    current.made += made;
    current.attempted += attempted;
    current.pct = percent(current.made, current.attempted);
    bucket.set(row.player.id, current);
  }

  return [...bucket.values()]
    .filter((row) => row.attempted > 0)
    .sort((a, b) => b.pct - a.pct || b.attempted - a.attempted)
    .slice(0, 3);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; phase?: string }>;
}) {
  const user = await requireAppUser();
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
  const totals = filteredStatRows.reduce(
    (acc, row) => ({
      points: acc.points + row.stat.points,
      rebounds: acc.rebounds + row.stat.offReb + row.stat.defReb,
      assists: acc.assists + row.stat.assists,
    }),
    { points: 0, rebounds: 0, assists: 0 },
  );

  const gameSeries = filteredGames
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((game) => {
      const rows = filteredStatRows.filter((row) => row.game.id === game.id);
      return {
        label: `${formatDate(game.date)} · ${game.opponent}`,
        points: rows.reduce((sum, row) => sum + row.stat.points, 0),
        rebounds: rows.reduce((sum, row) => sum + row.stat.offReb + row.stat.defReb, 0),
        assists: rows.reduce((sum, row) => sum + row.stat.assists, 0),
      };
    });

  const phaseBreakdown = gamePhases.map((phase) => ({
    name: phase.label,
    value: filteredGames.filter((game) => game.phase === phase.value).length,
  }));

  const categoryBuckets = emptyBuckets();
  for (const row of filteredStatRows) {
    addAggregate(categoryBuckets[row.game.category], row);
  }

  const topScorers = [...new Map(filteredStatRows.map((row) => [row.player.id, row])).values()]
    .map((row) => ({
      player: row.player,
      points: filteredStatRows.filter((item) => item.player.id === row.player.id).reduce((sum, item) => sum + item.stat.points, 0),
      rebounds: filteredStatRows.filter((item) => item.player.id === row.player.id).reduce((sum, item) => sum + item.stat.offReb + item.stat.defReb, 0),
      assists: filteredStatRows.filter((item) => item.player.id === row.player.id).reduce((sum, item) => sum + item.stat.assists, 0),
      games: filteredStatRows.filter((item) => item.player.id === row.player.id).length,
    }))
    .sort((a, b) => b.points - a.points || b.rebounds - a.rebounds || b.assists - a.assists)
    .slice(0, 5);

  const topGame = topScorers[0];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_30%_30%,rgba(245,158,11,0.22),transparent_55%)] lg:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Estadísticas</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Estadísticas JP Spurs</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Lectura compacta de producción, fases, líderes y eficiencia para decidir rápido desde el banco.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[40rem]">
            <div className="rounded-2xl border border-zinc-800 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Partidos</p>
              <p className="mt-2 text-3xl font-black text-amber-400">{filteredGames.length}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Jugadores</p>
              <p className="mt-2 text-3xl font-black text-amber-400">{new Set(filteredStatRows.map((row) => row.player.id)).size}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Puntos</p>
              <p className="mt-2 text-3xl font-black text-amber-400">{totals.points}</p>
            </div>
          </div>
        </div>
      </section>

      <GameFilters opponents={opponents} selectedOpponent={params.opponent} selectedPhase={params.phase} />

      {(params.opponent || params.phase) ? (
        <p className="text-sm text-zinc-500">
          Filtro activo: {params.opponent ? `vs ${params.opponent}` : "todos los rivales"} · {params.phase ? formatGamePhase(params.phase) : "todas las fases"}
        </p>
      ) : null}

      {filteredGames.length === 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">No hay partidos para ese filtro.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Promedio puntos</p>
              <p className="mt-2 text-4xl font-black">{(totals.points / filteredGames.length).toFixed(1)}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Fases activas</p>
              <p className="mt-2 text-4xl font-black">{new Set(filteredGames.map((game) => game.phase)).size}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Top scorer</p>
              <p className="mt-2 text-2xl font-black leading-tight">{topGame ? <Link href={`/players/${topGame.player.id}`}>{formatPlayerDisplayName(topGame.player)}</Link> : "-"}</p>
            </div>
          </div>

          <ReportsCharts games={gameSeries} phaseBreakdown={phaseBreakdown} />

          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Top 5</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Por categoría</h2>
              </div>
              <p className="text-sm text-zinc-500">Tocá un nombre para abrir la ficha del jugador.</p>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              {gameCategoryOptions.map((category) => {
                const leaders = topPlayers(categoryBuckets[category.value]);

                return (
                  <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50" key={category.value}>
                    <div className="border-b border-zinc-200 bg-white px-5 py-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">{category.label}</p>
                      <h3 className="mt-2 text-xl font-black tracking-tight">Top 5</h3>
                    </div>
                    <div className="divide-y divide-zinc-200">
                      {leaders.length === 0 ? (
                        <p className="px-5 py-6 text-sm text-zinc-500">No hay datos para esta categoría.</p>
                      ) : (
                        leaders.map((leader, index) => (
                          <Link className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white" href={`/players/${leader.player.id}`} key={leader.player.id}>
                            <div>
                              <p className="text-xs font-bold text-zinc-400">#{index + 1}</p>
                              <p className="font-semibold text-zinc-950">{formatPlayerDisplayName(leader.player)}</p>
                              <p className="text-xs text-zinc-500">{leader.games} partidos</p>
                            </div>
                            <div className="text-right text-sm font-semibold text-zinc-700">
                              <p>{leader.points} pts</p>
                              <p>{leader.rebounds} reb · {leader.assists} ast</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Top 3</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Mejores porcentajes</h2>
              </div>
              <p className="text-sm text-zinc-500">Ranking global dentro del filtro activo.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { key: "two" as const, title: "Dobles", rows: topShooters(filteredStatRows, "two") },
                { key: "three" as const, title: "Triples", rows: topShooters(filteredStatRows, "three") },
                { key: "ft" as const, title: "Simples", rows: topShooters(filteredStatRows, "ft") },
              ].map((bucket) => (
                <article className="rounded-3xl border border-zinc-100 bg-zinc-50" key={bucket.key}>
                  <div className="border-b border-zinc-200 bg-white px-5 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">{bucket.title}</p>
                  </div>
                  <div className="divide-y divide-zinc-200">
                    {bucket.rows.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-zinc-500">Sin intentos suficientes para ranking.</p>
                    ) : (
                      bucket.rows.map((row, index) => (
                        <Link className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white" href={`/players/${row.player.id}`} key={row.player.id}>
                          <div>
                            <p className="text-xs font-bold text-zinc-400">#{index + 1}</p>
                            <p className="font-semibold text-zinc-950">{formatPlayerDisplayName(row.player)}</p>
                            <p className="text-xs text-zinc-500">{row.made}/{row.attempted} intentos</p>
                          </div>
                          <div className="text-right text-sm font-semibold text-zinc-700">
                            <p>{row.pct.toFixed(1)}%</p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Partidos</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Detalle del filtro</h2>
            <div className="mt-5 grid gap-3">
              {filteredGames.map((game) => (
                <Link className="rounded-2xl border border-zinc-100 px-4 py-3 transition hover:bg-zinc-50" href={`/partidos/${game.id}`} key={game.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">Spurs vs {game.opponent}</p>
                      <p className="text-sm text-zinc-500">{formatDate(game.date)} · {formatGamePhase(game.phase)}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">{formatGameCategory(game.category)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

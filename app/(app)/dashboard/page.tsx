import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { StatCard } from "@/components/stat-card";
import { requireUser } from "@/lib/auth";
import { GameFilters } from "@/components/game-filters";
import { formatGamePhase } from "@/lib/game-phases";
import { formatGameCategory } from "@/lib/game-categories";
import { formatPlayerDisplayName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

type CategoryKey = "total" | "PM" | "M" | "U";

type LeaderRow = {
  player: typeof players.$inferSelect;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

type CategoryBuckets = Record<CategoryKey, Map<string, LeaderRow>>;

function emptyBuckets(): CategoryBuckets {
  return {
    total: new Map<string, LeaderRow>(),
    PM: new Map<string, LeaderRow>(),
    M: new Map<string, LeaderRow>(),
    U: new Map<string, LeaderRow>(),
  };
}

function addRow(bucket: Map<string, LeaderRow>, input: { player: typeof players.$inferSelect; stat: typeof playerGameStats.$inferSelect }) {
  const current = bucket.get(input.player.id) ?? {
    player: input.player,
    games: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
  };

  current.games += 1;
  current.points += input.stat.points;
  current.rebounds += input.stat.offReb + input.stat.defReb;
  current.assists += input.stat.assists;
  bucket.set(input.player.id, current);
}

function topFive(bucket: Map<string, LeaderRow>) {
  return [...bucket.values()].sort((a, b) => b.points - a.points || b.rebounds - a.rebounds || b.assists - a.assists).slice(0, 5);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; phase?: string; category?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const selectedCategory = (params.category ?? "total") as CategoryKey;
  const [allGames, statRows] = await Promise.all([
    db.select().from(games).where(eq(games.ownerUserId, user.id)),
    db
      .select({ player: players, stat: playerGameStats, game: games })
      .from(playerGameStats)
      .innerJoin(players, eq(playerGameStats.playerId, players.id))
      .innerJoin(games, eq(playerGameStats.gameId, games.id))
      .where(eq(games.ownerUserId, user.id)),
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
  const categoryFilteredGames = selectedCategory === "total" ? filteredGames : filteredGames.filter((game) => game.category === selectedCategory);
  const categoryFilteredGameIds = new Set(categoryFilteredGames.map((game) => game.id));
  const filteredStatRows = statRows.filter((row) => categoryFilteredGameIds.has(row.game.id));
  const totals = filteredStatRows.reduce(
    (acc, row) => ({
      points: acc.points + row.stat.points,
      rebounds: acc.rebounds + row.stat.offReb + row.stat.defReb,
      assists: acc.assists + row.stat.assists,
    }),
    { points: 0, rebounds: 0, assists: 0 },
  );
  const gameCount = categoryFilteredGames.length;
  const categoryBuckets = emptyBuckets();

  for (const row of filteredStatRows) {
    addRow(categoryBuckets.total, row);
    addRow(categoryBuckets[row.game.category], row);
  }

  const visibleCategories: CategoryKey[] = selectedCategory === "total" ? ["PM", "M", "U"] : [selectedCategory];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Dashboard</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">La pizarra del banco</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Filtrá por rival o fase y mirá cómo responde el equipo en puntos, rebotes y asistencias.
        </p>
      </section>

      <GameFilters opponents={opponents} selectedCategory={selectedCategory} selectedOpponent={params.opponent} selectedPhase={params.phase} />

      {(params.opponent || params.phase) ? (
        <p className="text-sm text-zinc-500">
          Filtro activo: {params.opponent ? `vs ${params.opponent}` : "todos los rivales"} · {params.phase ? formatGamePhase(params.phase) : "todas las fases"} · {selectedCategory === "total" ? "Todo" : formatGameCategory(selectedCategory)}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Puntos" value={totals.points} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
        <StatCard label="Rebotes" value={totals.rebounds} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
        <StatCard label="Asistencias" value={totals.assists} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
      </div>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Top 5</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Líderes por categoría</h2>
          </div>
          <Link className="text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" href="/reports">
            Ver estadísticas completas
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {visibleCategories.map((category) => {
            const leaders = topFive(categoryBuckets[category]);

            return (
              <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50" key={category}>
                <div className="border-b border-zinc-200 bg-white px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">{formatGameCategory(category)}</p>
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
    </div>
  );
}

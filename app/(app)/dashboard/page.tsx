import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { StatCard } from "@/components/stat-card";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type CategoryKey = "total" | "PM" | "M";
type LeaderMetric = "points" | "rebounds" | "assists";

type PlayerTotal = {
  playerId: string;
  name: string;
  lastName: string | null;
  jerseyNumber: number | null;
  games: number;
  points: number;
  rebounds: number;
  assists: number;
};

const sections: { id: CategoryKey; title: string; helper: string }[] = [
  { id: "total", title: "General", helper: "Todos los torneos" },
  { id: "PM", title: "+30", helper: "Torneo +30" },
  { id: "M", title: "+40", helper: "Torneo +40" },
];

const metrics: { key: LeaderMetric; title: string; short: string }[] = [
  { key: "points", title: "Puntos", short: "PTS" },
  { key: "rebounds", title: "Rebotes", short: "REB" },
  { key: "assists", title: "Asistencias", short: "AST" },
];

function displayName(player: PlayerTotal) {
  return player.lastName && !player.name.includes(player.lastName)
    ? `${player.name} ${player.lastName}`
    : player.name;
}

function emptyBuckets() {
  return {
    total: new Map<string, PlayerTotal>(),
    PM: new Map<string, PlayerTotal>(),
    M: new Map<string, PlayerTotal>(),
  } satisfies Record<CategoryKey, Map<string, PlayerTotal>>;
}

function addStat(
  bucket: Map<string, PlayerTotal>,
  input: {
    player: typeof players.$inferSelect;
    stat: typeof playerGameStats.$inferSelect;
  },
) {
  const current = bucket.get(input.player.id) ?? {
    playerId: input.player.id,
    name: input.player.name,
    lastName: input.player.lastName,
    jerseyNumber: input.player.jerseyNumber,
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

function leadersFor(playersTotals: PlayerTotal[], metric: LeaderMetric) {
  return [...playersTotals]
    .sort((a, b) => b[metric] - a[metric] || displayName(a).localeCompare(displayName(b)))
    .slice(0, 5);
}

export default async function DashboardPage() {
  const user = await requireAdmin();
  const [[playerCount], [gameCount], statRows] = await Promise.all([
    db.select({ value: count() }).from(players).where(eq(players.ownerUserId, user.id)),
    db.select({ value: count() }).from(games).where(eq(games.ownerUserId, user.id)),
    db
      .select({ player: players, stat: playerGameStats, game: games })
      .from(playerGameStats)
      .innerJoin(players, eq(playerGameStats.playerId, players.id))
      .innerJoin(games, eq(playerGameStats.gameId, games.id))
      .where(eq(games.ownerUserId, user.id)),
  ]);
  const buckets = emptyBuckets();

  for (const row of statRows) {
    addStat(buckets.total, row);
    addStat(buckets[row.game.category], row);
  }
  const totalsBySection = Object.fromEntries(
    sections.map((section) => [section.id, Array.from(buckets[section.id].values())]),
  ) as Record<CategoryKey, PlayerTotal[]>;
  const totalStatsRows = statRows.length;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Dashboard</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Jugadores" value={playerCount.value} helper="Fichas del plantel" />
        <StatCard label="Partidos" value={gameCount.value} helper="PM y M" />
        <StatCard label="Stats" value={totalStatsRows} helper="Líneas procesadas desde PDFs" />
      </div>

      <nav className="mt-8 flex flex-wrap gap-2 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
        {sections.map((section) => (
          <a className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-950 hover:text-white" href={`#${section.id}`} key={section.id}>
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid gap-8">
        {sections.map((section) => {
          const sectionTotals = totalsBySection[section.id];

          return (
            <section className="scroll-mt-6" id={section.id} key={section.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">{section.helper}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">Líderes {section.title}</h2>
                </div>
                <Link className="text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" href="/import">
                  Importar otro PDF
                </Link>
              </div>

              {sectionTotals.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                  Todavía no hay estadísticas procesadas para esta sección. Subí o reintentá un PDF desde Importar PDF.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {metrics.map((metric) => (
                    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm" key={metric.key}>
                      <div className="border-b border-zinc-100 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">{metric.short}</p>
                        <h3 className="mt-1 text-2xl font-black">{metric.title}</h3>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {leadersFor(sectionTotals, metric.key).map((player, index) => (
                          <Link className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50" href={`/players/${player.playerId}`} key={player.playerId}>
                            <div>
                              <p className="text-xs font-bold text-zinc-400">#{index + 1}</p>
                              <p className="font-semibold text-zinc-950">{displayName(player)}</p>
                              <p className="text-xs text-zinc-500">Camiseta #{player.jerseyNumber ?? "-"} · {player.games} PJ</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-zinc-950">{player[metric.key]}</p>
                              <p className="text-xs font-semibold text-zinc-500">{(player[metric.key] / player.games).toFixed(1)} por juego</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

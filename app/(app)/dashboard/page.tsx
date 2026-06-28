import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { games, playerGameStats } from "@/db/schema";
import { StatCard } from "@/components/stat-card";
import { requireUser } from "@/lib/auth";
import { GameFilters } from "@/components/game-filters";
import { formatGamePhase } from "@/lib/game-phases";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; phase?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [allGames, statRows] = await Promise.all([
    db.select().from(games).where(eq(games.ownerUserId, user.id)),
    db
      .select({ stat: playerGameStats, game: games })
      .from(playerGameStats)
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
  const gameCount = filteredGames.length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Dashboard</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">La pizarra del banco</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Filtrá por rival o fase y mirá cómo responde el equipo en puntos, rebotes y asistencias.
        </p>
      </section>

      <GameFilters opponents={opponents} selectedOpponent={params.opponent} selectedPhase={params.phase} />

      {(params.opponent || params.phase) ? (
        <p className="text-sm text-zinc-500">
          Filtro activo: {params.opponent ? `vs ${params.opponent}` : "todos los rivales"} · {params.phase ? formatGamePhase(params.phase) : "todas las fases"}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Puntos" value={totals.points} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
        <StatCard label="Rebotes" value={totals.rebounds} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
        <StatCard label="Asistencias" value={totals.assists} helper={gameCount === 0 ? "Sin partidos en este filtro" : `Total del filtro en ${gameCount} partido(s)`} />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Lectura rápida</p>
        <p className="mt-2 text-sm text-zinc-600">Las 3 tarjetas se recalculan al instante con el filtro que elijas arriba.</p>
        <Link className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" href="/reports">
          Abrir reportes completos
        </Link>
      </div>
    </div>
  );
}

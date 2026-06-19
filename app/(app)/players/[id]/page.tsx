import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { StatCard } from "@/components/stat-card";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { advancedStats, type BaseStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Row = {
  stat: typeof playerGameStats.$inferSelect;
  game: typeof games.$inferSelect;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function pct(made: number, attempted: number) {
  return attempted === 0 ? "0.0%" : `${((made / attempted) * 100).toFixed(1)}%`;
}

function perGame(value: number, gamesCount: number) {
  return gamesCount === 0 ? "0.0" : (value / gamesCount).toFixed(1);
}

function emptyTotals(): BaseStats & { minutes: number; plusMinus: number; games: number } {
  return {
    games: 0,
    minutes: 0,
    points: 0,
    fgMade: 0,
    fgAtt: 0,
    twoMade: 0,
    twoAtt: 0,
    threeMade: 0,
    threeAtt: 0,
    ftMade: 0,
    ftAtt: 0,
    offReb: 0,
    defReb: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    plusMinus: 0,
  };
}

function totalsFor(rows: Row[]) {
  return rows.reduce((total, row) => {
    total.games += 1;
    total.minutes += row.stat.minutes;
    total.points += row.stat.points;
    total.fgMade += row.stat.fgMade;
    total.fgAtt += row.stat.fgAtt;
    total.twoMade += row.stat.twoMade;
    total.twoAtt += row.stat.twoAtt;
    total.threeMade += row.stat.threeMade;
    total.threeAtt += row.stat.threeAtt;
    total.ftMade += row.stat.ftMade;
    total.ftAtt += row.stat.ftAtt;
    total.offReb += row.stat.offReb;
    total.defReb += row.stat.defReb;
    total.assists += row.stat.assists;
    total.steals += row.stat.steals;
    total.blocks += row.stat.blocks;
    total.turnovers += row.stat.turnovers;
    total.fouls += row.stat.fouls;
    total.plusMinus += row.stat.plusMinus;
    return total;
  }, emptyTotals());
}

function filterHref(playerId: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();

  return `/players/${playerId}${query ? `?${query}` : ""}`;
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; gameId?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const filters = await searchParams;

  if (user.role !== "admin" && user.playerId !== id) {
    redirect("/me");
  }

  const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);

  if (!player) {
    notFound();
  }

  const rows = await db
    .select({ stat: playerGameStats, game: games })
    .from(playerGameStats)
    .innerJoin(games, eq(playerGameStats.gameId, games.id))
    .where(
      filters.category === "PM" || filters.category === "M"
        ? and(eq(playerGameStats.playerId, id), eq(games.category, filters.category))
        : eq(playerGameStats.playerId, id),
    );
  const filteredRows = filters.gameId
    ? rows.filter((row) => row.game.id === filters.gameId)
    : rows;
  const orderedRows = filteredRows.sort(
    (a, b) => b.game.date.getTime() - a.game.date.getTime(),
  );
  const allGames = rows
    .map((row) => row.game)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const totals = totalsFor(orderedRows);
  const advanced = advancedStats(totals);
  const rebounds = totals.offReb + totals.defReb;
  const activeCategory = filters.category ?? "total";

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Jugador</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">{player.name}</h1>
          <p className="mt-2 text-zinc-500">#{player.jerseyNumber ?? "-"} · Estadísticas históricas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={`rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === "total" ? "bg-zinc-950 text-white" : "bg-white text-zinc-700"}`} href={filterHref(id, { gameId: filters.gameId })}>
            Total
          </Link>
          <Link className={`rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === "PM" ? "bg-zinc-950 text-white" : "bg-white text-zinc-700"}`} href={filterHref(id, { category: "PM", gameId: filters.gameId })}>
            +30
          </Link>
          <Link className={`rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === "M" ? "bg-zinc-950 text-white" : "bg-white text-zinc-700"}`} href={filterHref(id, { category: "M", gameId: filters.gameId })}>
            +40
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-zinc-700">
          Ver partido específico
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <select className="w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={filters.gameId ?? ""} id="game-filter">
              <option value="">Todos los partidos</option>
              {allGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {formatDate(game.date)} · {game.category === "PM" ? "+30" : "+40"} · vs {game.opponent}
                </option>
              ))}
            </select>
            <a className="rounded-xl bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-white" href={filterHref(id, { category: filters.category })}>
              Limpiar partido
            </a>
          </div>
        </label>
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById("game-filter")?.addEventListener("change", function(event) { const value = event.target.value; const url = new URL(window.location.href); if (value) url.searchParams.set("gameId", value); else url.searchParams.delete("gameId"); window.location.href = url.toString(); });` }} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="PJ" value={totals.games} helper="Partidos" />
        <StatCard label="PTS" value={perGame(totals.points, totals.games)} helper={`${totals.points} total`} />
        <StatCard label="REB" value={perGame(rebounds, totals.games)} helper={`${rebounds} total`} />
        <StatCard label="AST" value={perGame(totals.assists, totals.games)} helper={`${totals.assists} total`} />
        <StatCard label="eFG%" value={`${advanced.efgPct}%`} helper="Efectividad ajustada" />
        <StatCard label="PIR" value={advanced.pir} helper="Valoración total" />
      </div>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <h2 className="text-2xl font-black tracking-tight">Game Log</h2>
            <p className="mt-1 text-sm text-zinc-500">Línea por partido cargado desde PDF.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Rival</th>
                  <th className="px-4 py-3">Cat.</th>
                  <th className="px-4 py-3">MIN</th>
                  <th className="px-4 py-3">PTS</th>
                  <th className="px-4 py-3">REB</th>
                  <th className="px-4 py-3">AST</th>
                  <th className="px-4 py-3">ROB</th>
                  <th className="px-4 py-3">TAP</th>
                  <th className="px-4 py-3">FG</th>
                  <th className="px-4 py-3">3P</th>
                  <th className="px-4 py-3">FT</th>
                  <th className="px-4 py-3">+/-</th>
                </tr>
              </thead>
              <tbody>
                {orderedRows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-zinc-500" colSpan={13}>No hay estadísticas para este filtro.</td></tr>
                ) : null}
                {orderedRows.map((row) => (
                  <tr className="border-t border-zinc-100" key={row.stat.id}>
                    <td className="px-4 py-3 font-medium">{formatDate(row.game.date)}</td>
                    <td className="px-4 py-3">{row.game.opponent}</td>
                    <td className="px-4 py-3">{row.game.category === "PM" ? "+30" : "+40"}</td>
                    <td className="px-4 py-3">{row.stat.minutes}</td>
                    <td className="px-4 py-3 font-bold">{row.stat.points}</td>
                    <td className="px-4 py-3">{row.stat.offReb + row.stat.defReb}</td>
                    <td className="px-4 py-3">{row.stat.assists}</td>
                    <td className="px-4 py-3">{row.stat.steals}</td>
                    <td className="px-4 py-3">{row.stat.blocks}</td>
                    <td className="px-4 py-3">{row.stat.fgMade}-{row.stat.fgAtt}</td>
                    <td className="px-4 py-3">{row.stat.threeMade}-{row.stat.threeAtt}</td>
                    <td className="px-4 py-3">{row.stat.ftMade}-{row.stat.ftAtt}</td>
                    <td className="px-4 py-3">{row.stat.plusMinus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Splits</p>
          <h2 className="mt-3 text-3xl font-black">Shooting</h2>
          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-zinc-400">FG</p><p className="mt-1 text-2xl font-black">{totals.fgMade}-{totals.fgAtt}</p><p className="text-sm text-zinc-400">{pct(totals.fgMade, totals.fgAtt)}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-zinc-400">3P</p><p className="mt-1 text-2xl font-black">{totals.threeMade}-{totals.threeAtt}</p><p className="text-sm text-zinc-400">{pct(totals.threeMade, totals.threeAtt)}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-zinc-400">FT</p><p className="mt-1 text-2xl font-black">{totals.ftMade}-{totals.ftAtt}</p><p className="text-sm text-zinc-400">{pct(totals.ftMade, totals.ftAtt)}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-zinc-400">TS%</p><p className="mt-1 text-2xl font-black">{advanced.tsPct}%</p></div>
          </div>
        </aside>
      </section>
    </div>
  );
}

import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { StatCard } from "@/components/stat-card";
import { updateGameDetails } from "@/app/actions/games";
import { db } from "@/db";
import { games, playerGameStats, players, tournaments } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { formatGameCategory, gameCategoryOptions } from "@/lib/game-categories";
import { advancedStats, type BaseStats } from "@/lib/stats";
import { formatPlayerDisplayName } from "@/lib/player-name";
import { formatGamePhase } from "@/lib/game-phases";

export const dynamic = "force-dynamic";

type Row = {
  player: typeof players.$inferSelect;
  stat: typeof playerGameStats.$inferSelect;
};

type RecordStat = {
  value: number;
  row: Row;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function pct(made: number, attempted: number) {
  return attempted === 0 ? "0.0%" : `${((made / attempted) * 100).toFixed(1)}%`;
}

function toDatetimeLocalValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
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

function bestRecordFor(rows: Row[], metric: "points" | "assists" | "rebounds") {
  return rows.reduce<RecordStat | null>((best, row) => {
    const value =
      metric === "points"
        ? row.stat.points
        : metric === "assists"
          ? row.stat.assists
          : row.stat.offReb + row.stat.defReb;

    if (!best || value > best.value) {
      return { value, row };
    }

    return best;
  }, null);
}

export default async function PartidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAppUser();
  const { id } = await params;
  const [gameRows, tournamentRows] = await Promise.all([
    db
      .select()
      .from(games)
      .where(and(eq(games.id, id), eq(games.ownerUserId, user.id)))
      .limit(1),
    db.select().from(tournaments).where(eq(tournaments.ownerUserId, user.id)),
  ]);
  const [game] = gameRows;

  if (!game) {
    notFound();
  }

  const rows = await db
    .select({ player: players, stat: playerGameStats })
    .from(playerGameStats)
    .innerJoin(players, eq(playerGameStats.playerId, players.id))
    .where(eq(playerGameStats.gameId, id));

  const orderedRows = [...rows].sort((a, b) => b.stat.points - a.stat.points || formatPlayerDisplayName(a.player).localeCompare(formatPlayerDisplayName(b.player)));
  const totals = totalsFor(rows);
  const advanced = advancedStats(totals);
  const rebounds = totals.offReb + totals.defReb;
  const recordPoints = bestRecordFor(rows, "points");
  const recordAssists = bestRecordFor(rows, "assists");
  const recordRebounds = bestRecordFor(rows, "rebounds");
  const currentTournament = tournamentRows.find((item) => item.id === game.tournamentId);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Partidos</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Spurs vs {game.opponent}</h1>
          <p className="mt-3 text-zinc-600">{formatDate(game.date)} · {formatGameCategory(game.category)} · {formatGamePhase(game.phase)} · {game.isHome ? "Local" : "Visitante"}</p>
          {game.location ? <p className="mt-1 text-sm text-zinc-500">{game.location}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700" href="/partidos">
            Volver a partidos
          </Link>
          {game.youtubeUrl ? (
            <a className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" href={game.youtubeUrl} target="_blank">
              Ver video
            </a>
          ) : null}
        </div>
      </div>

      {user.role === "admin" ? (
        <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Edición</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Editar partido</h2>
            </div>
            <p className="text-sm text-zinc-500">Solo administradores pueden cambiar la fecha o el torneo.</p>
          </div>
          <form action={updateGameDetails} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input name="gameId" type="hidden" value={game.id} />
            <label className="block text-sm font-medium text-zinc-700">
              Categoría
              <select
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                defaultValue={game.category}
                name="category"
                required
              >
                {gameCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Fase
              <select
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                defaultValue={game.phase}
                name="phase"
                required
              >
                <option value="regular">Fase regular</option>
                <option value="quarterfinal">Cuartos de final</option>
                <option value="semifinal">Semifinal</option>
                <option value="final">Final</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Fecha y hora
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                defaultValue={toDatetimeLocalValue(game.date)}
                name="date"
                type="datetime-local"
                required
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Torneo
              <select
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                defaultValue={game.tournamentId ?? ""}
                name="tournamentId"
              >
                <option value="">Sin torneo</option>
                {tournamentRows.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="self-end rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white xl:col-span-1" type="submit">
              Guardar cambios
            </button>
          </form>
          <p className="mt-3 text-xs text-zinc-500">
            Torneo actual: {currentTournament?.name ?? "Sin torneo"}
          </p>
        </section>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="PJ" value={totals.games} helper="Jugadores con stats" />
        <StatCard label="PTS" value={totals.points} helper="Puntos totales" />
        <StatCard label="REB" value={rebounds} helper="Rebotes totales" />
        <StatCard label="AST" value={totals.assists} helper="Asistencias totales" />
        <StatCard label="eFG%" value={`${advanced.efgPct}%`} helper="Efectividad ajustada" />
        <StatCard label="PIR" value={advanced.pir} helper="Valoración total" />
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { label: "Récord puntos", record: recordPoints, color: "from-rose-500 to-orange-500", helper: "PTS" },
          { label: "Récord rebotes", record: recordRebounds, color: "from-cyan-500 to-blue-600", helper: "REB" },
          { label: "Récord asistencias", record: recordAssists, color: "from-emerald-500 to-teal-600", helper: "AST" },
        ].map(({ label, record, color, helper }) => (
          <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm" key={label}>
            <div className={`bg-gradient-to-r ${color} p-5 text-white`}>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">{label}</p>
              <p className="mt-2 text-4xl font-black">{record?.value ?? 0}</p>
              <p className="mt-1 text-sm text-white/80">{record ? formatPlayerDisplayName(record.row.player) : "Sin datos"}</p>
            </div>
            {record ? (
              <div className="flex items-center justify-between p-4 text-sm">
                <span className="font-medium text-zinc-600">{helper} destacados</span>
                <span className="rounded-full bg-zinc-950 px-4 py-2 font-semibold text-white">{record.value}</span>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {orderedRows.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Este partido todavía no tiene estadísticas cargadas.
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <h2 className="text-2xl font-black tracking-tight">Box score</h2>
            <p className="mt-1 text-sm text-zinc-500">Detalle de cada jugador en el partido.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">MIN</th>
                  <th className="px-4 py-3">PTS</th>
                  <th className="px-4 py-3">FG</th>
                  <th className="px-4 py-3">2P</th>
                  <th className="px-4 py-3">3P</th>
                  <th className="px-4 py-3">FT</th>
                  <th className="px-4 py-3">REB</th>
                  <th className="px-4 py-3">AST</th>
                  <th className="px-4 py-3">ROB</th>
                  <th className="px-4 py-3">BLK</th>
                  <th className="px-4 py-3">TO</th>
                  <th className="px-4 py-3">+/-</th>
                </tr>
              </thead>
              <tbody>
                {orderedRows.map((row) => (
                  <tr className="border-t border-zinc-100" key={row.stat.id}>
                    <td className="px-4 py-3 font-semibold text-zinc-950">
                      <Link className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700" href={`/players/${row.player.id}`}>
                        {formatPlayerDisplayName(row.player)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.stat.minutes}</td>
                    <td className="px-4 py-3 font-semibold">{row.stat.points}</td>
                    <td className="px-4 py-3">{row.stat.fgMade}/{row.stat.fgAtt}</td>
                    <td className="px-4 py-3">{row.stat.twoMade}/{row.stat.twoAtt}</td>
                    <td className="px-4 py-3">{row.stat.threeMade}/{row.stat.threeAtt}</td>
                    <td className="px-4 py-3">{row.stat.ftMade}/{row.stat.ftAtt}</td>
                    <td className="px-4 py-3">{row.stat.offReb + row.stat.defReb}</td>
                    <td className="px-4 py-3">{row.stat.assists}</td>
                    <td className="px-4 py-3">{row.stat.steals}</td>
                    <td className="px-4 py-3">{row.stat.blocks}</td>
                    <td className="px-4 py-3">{row.stat.turnovers}</td>
                    <td className="px-4 py-3">{row.stat.plusMinus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">FG%</p>
          <p className="mt-2 text-4xl font-black">{pct(totals.fgMade, totals.fgAtt)}</p>
          <p className="mt-2 text-sm text-zinc-500">2P {pct(totals.twoMade, totals.twoAtt)} · 3P {pct(totals.threeMade, totals.threeAtt)} · FT {pct(totals.ftMade, totals.ftAtt)}</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">TS%</p>
          <p className="mt-2 text-4xl font-black">{advanced.tsPct}%</p>
          <p className="mt-2 text-sm text-zinc-500">Eficiencia ofensiva del equipo en este partido.</p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">Resumen</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">{game.finalScore ?? "Resultado pendiente"}</p>
          <p className="mt-2 text-sm text-zinc-500">{game.validationNotes ?? "Sin notas de validación para este partido."}</p>
        </div>
      </section>
    </div>
  );
}

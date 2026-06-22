import { and, desc, eq } from "drizzle-orm";
import { createTournament } from "@/app/actions/tournaments";
import { registerImport } from "@/app/actions/import";
import { resolvePlayerMatch } from "@/app/actions/player-matches";
import { db } from "@/db";
import { imports, playerMatchReviews, players, tournaments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
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

  return null;
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; file?: string; processed?: string; duplicates?: string; failed?: string }>;
}) {
  const user = await requireAdmin();
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
            {rows.map(({ row, tournamentName }) => (
              <div className="rounded-2xl border border-zinc-100 p-4" key={row.id}>
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
                  ) : null}
                </div>
                {row.analysisSummary ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">{row.analysisSummary}</p>
                ) : null}
                {row.error ? (
                  <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{row.error}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

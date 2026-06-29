import Link from "next/link";
import { and, asc, desc, gte, lt, eq } from "drizzle-orm";
import { CalendarPlus } from "lucide-react";
import {
  createFixtureGame,
  deleteFixtureGame,
  syncFixtureWithGoogleCalendar,
  updateFixtureVideo,
} from "@/app/actions/fixture";
import { db } from "@/db";
import { games } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { getDashboardOwnerUserId } from "@/lib/auth";
import {
  calendarUrl,
  googleCalendarEmbedUrl,
  googleCalendarSubscribeUrl,
} from "@/lib/calendar";
import { formatGameCategory, gameCategoryOptions } from "@/lib/game-categories";
import { googleCalendarConfigured, googleOAuthConfigured } from "@/lib/google-calendar";
import { getLocationLink } from "@/lib/locations";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function GameCard({
  game,
  isAdmin,
  past,
}: {
  game: typeof games.$inferSelect;
  isAdmin: boolean;
  past?: boolean;
}) {
  const locationLink = getLocationLink(game.location);

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            {formatGameCategory(game.category)} · {game.isHome ? "Local" : "Visitante"}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Spurs vs {game.opponent}
            {past && game.finalScore ? ` - ${game.finalScore}` : ""}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{formatDate(game.date)}</p>
          {game.location ? (
            locationLink ? (
              <a className="mt-1 inline-flex text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" href={locationLink} target="_blank">
                {game.location}
              </a>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">{game.location}</p>
            )
          ) : null}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${past ? "bg-zinc-100 text-zinc-700" : "bg-amber-100 text-amber-800"}`}>
          {past ? "Jugado" : "Próximo"}
        </span>
      </div>
      {game.finalScore ? (
        <p className="mt-5 rounded-2xl bg-zinc-950 px-4 py-3 text-lg font-black text-white">
          {game.finalScore}
        </p>
      ) : (
        <p className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-500">
          Resultado pendiente
        </p>
      )}
      {game.youtubeUrl ? (
        <a
          className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          href={game.youtubeUrl}
          target="_blank"
        >
          Ver video en YouTube
        </a>
      ) : null}
          {isAdmin && past ? (
        <form action={updateFixtureVideo} className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <input name="gameId" type="hidden" value={game.id} />
          <label className="text-sm font-medium text-zinc-700">
            Video de YouTube
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
              defaultValue={game.youtubeUrl ?? ""}
              name="youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
          </label>
          <button className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900" type="submit">
            Guardar clip
          </button>
        </form>
      ) : null}
      {isAdmin ? (
        <form action={deleteFixtureGame} className="mt-4">
          <input name="gameId" type="hidden" value={game.id} />
          <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="submit">
            Eliminar partido
          </button>
        </form>
      ) : null}
    </article>
  );
}

function syncMessage(code?: string) {
  if (code === "ok") {
    return {
      className: "border-green-200 bg-green-50 text-green-800",
      text: "Calendario sincronizado con Google Calendar.",
    };
  }

  if (code === "calendar-api-disabled") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      text: "La API de Calendar está deshabilitada en el proyecto 1017462901358. Habilitala en Google Cloud y volvé a sincronizar.",
    };
  }

  if (code === "calendar-not-found") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      text: "No se encontró el calendario configurado. Verificá GOOGLE_CALENDAR_ID y que tu cuenta tenga acceso.",
    };
  }

  if (code === "calendar-permission-denied") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      text: "Google rechazó el permiso para crear eventos. Reautorizá Calendar desde Mi perfil.",
    };
  }

  if (code === "calendar-auth-expired") {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-900",
      text: "La autorización de Google Calendar venció. Reconectá Calendar y volvé a sincronizar.",
    };
  }

  if (code === "calendar-error") {
    return {
      className: "border-red-200 bg-red-50 text-red-800",
      text: "No se pudo sincronizar con Google Calendar. Revisá la configuración de Google Cloud.",
    };
  }

  return null;
}

export default async function FixturePage({
  searchParams,
}: {
  searchParams: Promise<{ sync?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const message = syncMessage(params.sync);
  const now = new Date();
  const ownerId = await getDashboardOwnerUserId(user.id, user.role);
  const [upcomingGames, pastGames] = await Promise.all([
    db.select().from(games).where(and(eq(games.ownerUserId, ownerId), gte(games.date, now))).orderBy(asc(games.date)),
    db.select().from(games).where(and(eq(games.ownerUserId, ownerId), lt(games.date, now))).orderBy(desc(games.date)),
  ]);
  const googleUrl = googleCalendarSubscribeUrl();
  const embedUrl = googleCalendarEmbedUrl();
  const icsUrl = calendarUrl() ?? "/api/calendar/fixture.ics";
  const googleCredentialsConfigured = googleOAuthConfigured();
  const googleSyncConfigured = await googleCalendarConfigured();

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Calendario</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Pizarra de partidos</h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Resultados, próximos partidos y todo el calendario de J.P. Spurs en un solo lugar.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {user.role === "admin" ? (
            googleSyncConfigured ? (
              <form action={syncFixtureWithGoogleCalendar}>
                <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950" type="submit">
                  Sincronizar calendario
                </button>
              </form>
            ) : (
              <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950" href="/api/google-calendar/connect">
                Conectar Calendar
              </Link>
            )
          ) : null}
          {googleUrl ? (
            <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" href={googleUrl} target="_blank">
              <CalendarPlus size={16} /> Abrir en Google Calendar
            </Link>
          ) : (
            <a className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" href={icsUrl}>
              <CalendarPlus size={16} /> Descargar archivo .ics
            </a>
          )}
        </div>
      </div>

      {message ? (
        <p className={`mt-4 rounded-2xl border p-4 text-sm ${message.className}`}>
          {message.text}
          {params.sync === "calendar-api-disabled" ? (
            <>
              {" "}
              <a
                className="font-semibold underline"
                href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=1017462901358"
                target="_blank"
              >
                Habilitar API de Calendar
              </a>
            </>
          ) : null}
          {params.sync === "calendar-auth-expired" ? (
            <>
              {" "}
              <Link className="font-semibold underline" href="/api/google-calendar/connect">
                Reconectar Calendar
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {!googleUrl ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Para mostrar el botón directo de Google Calendar, configurá `NEXT_PUBLIC_SITE_URL` con una URL pública. En local queda disponible la descarga del `.ics`.
        </p>
      ) : null}

      {user.role === "admin" && !googleSyncConfigured ? (
        <p className={`mt-4 rounded-2xl border p-4 text-sm ${googleCredentialsConfigured ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          {googleCredentialsConfigured
            ? "Google OAuth ya está configurado. Falta autorizar Calendar una vez: tocá Conectar Calendar y aceptá los permisos."
            : "Para crear eventos dentro del calendario embebido falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local."}
          {googleCredentialsConfigured ? " Si ya conectaste Google pero falta Calendar, andá a Mi perfil y tocá Autorizar Calendar." : ""}
        </p>
      ) : null}

      {embedUrl ? (
        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <iframe
            className="h-[560px] w-full"
            src={embedUrl}
            title="Calendario J.P. Spurs"
          />
        </section>
      ) : null}

      {user.role !== "read" ? (
        <form action={createFixtureGame} className="mt-8 grid gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-zinc-700">
              Rival
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="opponent" required />
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">
              Categoría
              <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="category" required>
                {gameCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-zinc-700">
              Fecha y hora
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="date" type="datetime-local" required />
            </label>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700">
              Resultado
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="finalScore" placeholder="Spurs 70 - Rival 65" />
            </label>
          </div>
          <div className="lg:col-span-3">
            <label className="text-sm font-medium text-zinc-700">
              Cancha / ubicación
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="location" />
            </label>
          </div>
          <div className="lg:col-span-3">
            <label className="text-sm font-medium text-zinc-700">
              Video de YouTube
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." type="url" />
            </label>
          </div>
          <label className="flex items-center gap-3 pt-8 text-sm font-medium text-zinc-700">
            <input defaultChecked name="isHome" type="checkbox" /> Local
          </label>
          <button className="rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white lg:col-span-2 lg:self-end" type="submit">
            Sumar partido
          </button>
        </form>
      ) : null}

      <section className="mt-10">
        <h2 className="text-2xl font-black tracking-tight">Próximos compromisos</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {upcomingGames.length === 0 ? <p className="text-zinc-500">No hay compromisos próximos cargados.</p> : null}
          {upcomingGames.map((game) => <GameCard game={game} isAdmin={user.role !== "read"} key={game.id} />)}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-black tracking-tight">Partidos ya jugados</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {pastGames.length === 0 ? <p className="text-zinc-500">No hay partidos cerrados cargados.</p> : null}
          {pastGames.map((game) => <GameCard game={game} isAdmin={user.role !== "read"} key={game.id} past />)}
        </div>
      </section>
    </div>
  );
}

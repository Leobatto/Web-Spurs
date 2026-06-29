import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { account, appSettings, games, user } from "@/db/schema";
import { ADMIN_EMAIL } from "@/lib/auth";
import { formatGameCategory } from "@/lib/game-categories";
import { getLocationLink } from "@/lib/locations";

type Game = typeof games.$inferSelect;

function calendarId() {
  return (
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID ||
    "781f2cd4217f8e3f73846e497877f2ba10863260e7d43781ae9cf82df3e11b70@group.calendar.google.com"
  );
}

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleOAuthClient(redirectPath = "/api/google-calendar/callback") {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const explicitRedirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (explicitRedirectUri) {
    return new google.auth.OAuth2(clientId, clientSecret, explicitRedirectUri);
  }

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl.replace(/\/$/, "")}${redirectPath}`,
  );
}

async function getStoredRefreshToken() {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return process.env.GOOGLE_REFRESH_TOKEN;
  }

  const [setting] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "google_calendar_refresh_token"))
    .limit(1);

  return setting?.value ?? null;
}

async function getLinkedGoogleCalendarToken() {
  const [admin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, ADMIN_EMAIL))
    .limit(1);

  if (!admin) {
    return null;
  }

  const [linkedAccount] = await db
    .select()
    .from(account)
    .where(eq(account.userId, admin.id))
    .limit(10);

  if (hasValidCalendarAccess(linkedAccount)) {
    return linkedAccount.accessToken;
  }

  const linkedAccounts = await db
    .select()
    .from(account)
    .where(eq(account.userId, admin.id));

  return (
    linkedAccounts.find((row) => hasValidCalendarAccess(row))?.accessToken ?? null
  );
}

function hasValidCalendarAccess(row: typeof account.$inferSelect | undefined) {
  if (
    row?.providerId !== "google" ||
    !row.accessToken ||
    !row.scope?.includes("https://www.googleapis.com/auth/calendar.events")
  ) {
    return false;
  }

  if (!row.accessTokenExpiresAt) {
    return true;
  }

  return row.accessTokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000;
}

async function getCalendarClient() {
  const auth = googleOAuthClient();
  const refreshToken = await getStoredRefreshToken();

  if (!auth) {
    return null;
  }

  if (refreshToken) {
    auth.setCredentials({ refresh_token: refreshToken });
  } else {
    const accessToken = await getLinkedGoogleCalendarToken();

    if (!accessToken) {
      return null;
    }

    auth.setCredentials({ access_token: accessToken });
  }

  return google.calendar({ version: "v3", auth });
}

export async function googleCalendarConfigured() {
  return Boolean(
    googleOAuthConfigured() &&
      ((await getStoredRefreshToken()) || (await getLinkedGoogleCalendarToken())),
  );
}

export async function saveGoogleRefreshToken(refreshToken: string) {
  await db
    .insert(appSettings)
    .values({
      key: "google_calendar_refresh_token",
      value: refreshToken,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: refreshToken, updatedAt: new Date() },
    });
}

function eventTitle(game: Game) {
  const category = formatGameCategory(game.category);

  if (game.finalScore) {
    return `J.P. Spurs vs ${game.opponent} - ${game.finalScore} (${category})`;
  }

  return `J.P. Spurs vs ${game.opponent} (${category})`;
}

function localDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
}

function eventBody(game: Game) {
  const locationLink = getLocationLink(game.location);
  const description = [
    game.finalScore ? `Resultado: ${game.finalScore}` : "Resultado pendiente",
    `Categoria: ${formatGameCategory(game.category)}`,
    game.isHome ? "Local: J.P. Spurs" : "Visitante: J.P. Spurs",
    locationLink ? `Mapa: ${locationLink}` : null,
  ].filter(Boolean);
  const end = new Date(game.date.getTime() + 2 * 60 * 60 * 1000);

  return {
    summary: eventTitle(game),
    location: game.location ?? undefined,
    description: description.join("\n"),
    start: {
      dateTime: localDateTime(game.date),
      timeZone: "America/Argentina/Buenos_Aires",
    },
    end: {
      dateTime: localDateTime(end),
      timeZone: "America/Argentina/Buenos_Aires",
    },
  };
}

export async function syncGameToGoogleCalendar(game: Game) {
  const calendar = await getCalendarClient();

  if (!calendar) {
    return { skipped: true, reason: "Google Calendar no configurado." };
  }

  const event = eventBody(game);

  if (game.googleCalendarEventId) {
    await calendar.events.update({
      calendarId: calendarId(),
      eventId: game.googleCalendarEventId,
      requestBody: event,
    });

    return { skipped: false, eventId: game.googleCalendarEventId };
  }

  const created = await calendar.events.insert({
    calendarId: calendarId(),
    requestBody: event,
  });
  const eventId = created.data.id;

  if (eventId) {
    await db
      .update(games)
      .set({ googleCalendarEventId: eventId, updatedAt: new Date() })
      .where(eq(games.id, game.id));
  }

  return { skipped: false, eventId };
}

export function isGoogleAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("invalid authentication credentials") ||
    message.includes("Invalid Credentials") ||
    message.includes("401") ||
    message.includes("Login Required")
  );
}

export async function deleteGameFromGoogleCalendar(game: Game) {
  const calendar = await getCalendarClient();

  if (!calendar || !game.googleCalendarEventId) {
    return;
  }

  await calendar.events.delete({
    calendarId: calendarId(),
    eventId: game.googleCalendarEventId,
  });
}

export async function syncAllGamesToGoogleCalendar() {
  const rows = await db.select().from(games);
  let synced = 0;
  let skipped = 0;

  for (const game of rows) {
    const result = await syncGameToGoogleCalendar(game);

    if (result.skipped) {
      skipped += 1;
    } else {
      synced += 1;
    }
  }

  return { synced, skipped };
}

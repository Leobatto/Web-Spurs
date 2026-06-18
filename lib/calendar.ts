import type { InferSelectModel } from "drizzle-orm";
import type { games } from "@/db/schema";
import { getLocationLink } from "@/lib/locations";

type Game = InferSelectModel<typeof games>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function icsDate(date: Date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function calendarUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.BETTER_AUTH_URL;

  if (!siteUrl || siteUrl.includes("localhost")) {
    return null;
  }

  return `${siteUrl.replace(/\/$/, "")}/api/calendar/fixture.ics`;
}

export function googleCalendarEmbedUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL ?? null;
}

export function googleCalendarSubscribeUrl() {
  const calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID;

  if (calendarId) {
    return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarId)}`;
  }

  const url = calendarUrl();

  if (!url) {
    return null;
  }

  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url)}`;
}

export function fixtureIcs(gamesList: Game[]) {
  const now = icsDate(new Date());
  const events = gamesList.map((game) => {
    const start = game.date;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const title = game.finalScore
      ? `J.P. Spurs vs ${game.opponent} - ${game.finalScore} (${game.category})`
      : `J.P. Spurs vs ${game.opponent} (${game.category})`;
    const locationLink = getLocationLink(game.location);
    const description = game.finalScore
      ? `Resultado: ${game.finalScore}`
      : `Partido ${game.isHome ? "local" : "visitante"} - Categoria ${game.category}`;

    return [
      "BEGIN:VEVENT",
      `UID:${game.id}@spurs.leobatto.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeText(title)}`,
      `DESCRIPTION:${escapeText(locationLink ? `${description}\nMapa: ${locationLink}` : description)}`,
      game.location ? `LOCATION:${escapeText(game.location)}` : null,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JP Spurs//Fixture//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:J.P. Spurs Fixture",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

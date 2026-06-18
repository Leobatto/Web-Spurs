import { asc } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";
import { fixtureIcs } from "@/lib/calendar";

export async function GET() {
  const rows = await db.select().from(games).orderBy(asc(games.date));

  return new Response(fixtureIcs(rows), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=jp-spurs-fixture.ics",
    },
  });
}

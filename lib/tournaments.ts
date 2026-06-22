import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";

export const DEFAULT_TOURNAMENT_NAMES = [
  "2026 - Torneo de Verano",
  "2026 - Torneo Apertura",
] as const;

export async function getOrCreateDefaultTournaments(ownerUserId: string) {
  const existing = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.ownerUserId, ownerUserId));

  if (existing.length > 0) {
    return existing;
  }

  const now = new Date();
  const rows = DEFAULT_TOURNAMENT_NAMES.map((name, index) => ({
    id: `tournament_${ownerUserId}_${index}`,
    ownerUserId,
    name,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(tournaments).values(rows);

  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.ownerUserId, ownerUserId));
}

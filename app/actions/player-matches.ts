"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  imports,
  playerGameStats,
  playerMatchReviews,
  players,
} from "@/db/schema";
import { analyzedPlayerSchema } from "@/lib/import-analysis";
import { requireAdmin } from "@/lib/auth";
import { createId } from "@/lib/ids";

const resolveSchema = z.object({
  matchId: z.string().min(1),
  mode: z.enum(["suggested", "new"]),
});

async function insertResolvedStats(input: {
  matchId: string;
  playerId: string;
  status: "resolved" | "created";
}) {
  const [match] = await db
    .select()
    .from(playerMatchReviews)
    .where(eq(playerMatchReviews.id, input.matchId))
    .limit(1);

  if (!match) {
    throw new Error("No se encontro la coincidencia a resolver.");
  }

  const [importRow] = await db
    .select()
    .from(imports)
    .where(eq(imports.id, match.importId))
    .limit(1);

  if (!importRow?.gameId) {
    throw new Error("La importacion no tiene partido asociado.");
  }

  const stats = analyzedPlayerSchema.parse(match.rawStats);

  await db.insert(playerGameStats).values({
    id: createId("stat"),
    gameId: importRow.gameId,
    playerId: input.playerId,
    minutes: stats.minutes,
    points: stats.points,
    fgMade: stats.fgMade,
    fgAtt: stats.fgAtt,
    twoMade: stats.twoMade,
    twoAtt: stats.twoAtt,
    threeMade: stats.threeMade,
    threeAtt: stats.threeAtt,
    ftMade: stats.ftMade,
    ftAtt: stats.ftAtt,
    offReb: stats.offReb,
    defReb: stats.defReb,
    assists: stats.assists,
    steals: stats.steals,
    blocks: stats.blocks,
    turnovers: stats.turnovers,
    fouls: stats.fouls,
    plusMinus: stats.plusMinus,
  });

  await db
    .update(playerMatchReviews)
    .set({
      status: input.status,
      createdPlayerId: input.status === "created" ? input.playerId : match.createdPlayerId,
      updatedAt: new Date(),
    })
    .where(eq(playerMatchReviews.id, input.matchId));

  const pendingMatches = await db
    .select()
    .from(playerMatchReviews)
    .where(eq(playerMatchReviews.importId, match.importId));
  const unresolvedMatches = pendingMatches.filter((row) => row.status === "pending").length;

  await db
    .update(imports)
    .set({
      unresolvedMatches,
      status: unresolvedMatches === 0 ? "saved" : importRow.status,
      updatedAt: new Date(),
    })
    .where(eq(imports.id, match.importId));
}

export async function resolvePlayerMatch(formData: FormData) {
  const user = await requireAdmin();
  const parsed = resolveSchema.parse(Object.fromEntries(formData));

  const [match] = await db
    .select()
    .from(playerMatchReviews)
    .where(eq(playerMatchReviews.id, parsed.matchId))
    .limit(1);

  if (!match || match.ownerUserId !== user.id) {
    throw new Error("No autorizado.");
  }

  if (parsed.mode === "suggested") {
    if (!match.suggestedPlayerId) {
      throw new Error("No hay jugador sugerido para aceptar.");
    }

    await insertResolvedStats({
      matchId: parsed.matchId,
      playerId: match.suggestedPlayerId,
      status: "resolved",
    });
  } else {
    const playerId = createId("player");
    await db.insert(players).values({
      id: playerId,
      ownerUserId: user.id,
      name: match.rawName,
      jerseyNumber: null,
    });

    await insertResolvedStats({
      matchId: parsed.matchId,
      playerId,
      status: "created",
    });
  }

  revalidatePath("/import");
  revalidatePath("/roster");
  revalidatePath("/dashboard");
}

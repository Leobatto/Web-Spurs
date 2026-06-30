"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  imports,
  playerGameStats,
  playerMatchReviews,
  players,
} from "@/db/schema";
import { analyzedPlayerSchema } from "@/lib/import-analysis";
import { requireWrite } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { deriveLastName } from "@/lib/player-name";

const statOverrideSchema = z.object({
  minutes: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  points: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  offReb: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  defReb: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  assists: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  steals: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  blocks: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  turnovers: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  fouls: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  plusMinus: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().optional()),
});

const resolveSchema = z.object({
  matchId: z.string().min(1),
  mode: z.enum(["suggested", "existing", "new"]),
  playerId: z.string().optional(),
  name: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  jerseyNumber: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(0).max(99).optional(),
  ),
}).merge(statOverrideSchema);

function buildResolvedStats(matchStats: unknown, overrides: z.infer<typeof statOverrideSchema>) {
  const payload = {
    ...(matchStats && typeof matchStats === "object" && !Array.isArray(matchStats) ? matchStats : {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)),
  };

  return analyzedPlayerSchema.parse(payload);
}

async function insertResolvedStats(input: {
  matchId: string;
  playerId: string;
  status: "resolved" | "created";
  statsOverrides: z.infer<typeof statOverrideSchema>;
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

  const stats = buildResolvedStats(match.rawStats, input.statsOverrides);

  const [existingStat] = await db
    .select()
    .from(playerGameStats)
    .where(and(eq(playerGameStats.gameId, importRow.gameId), eq(playerGameStats.playerId, input.playerId)))
    .limit(1);

  const statPayload = {
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
  };

  if (existingStat) {
    await db
      .update(playerGameStats)
      .set({ ...statPayload, updatedAt: new Date() })
      .where(eq(playerGameStats.id, existingStat.id));
  } else {
    await db.insert(playerGameStats).values({
      id: createId("stat"),
      ...statPayload,
    });
  }

  await db
    .update(playerMatchReviews)
    .set({
      status: input.status,
      createdPlayerId: input.status === "created" ? input.playerId : match.createdPlayerId,
      rawStats: stats,
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
  const user = await requireWrite();
  const parsed = resolveSchema.parse(Object.fromEntries(formData));

  const [match] = await db
    .select()
    .from(playerMatchReviews)
    .where(eq(playerMatchReviews.id, parsed.matchId))
    .limit(1);

  if (!match || match.ownerUserId !== user.id) {
    throw new Error("No autorizado.");
  }

  if (match.status !== "pending") {
    redirect("/import?error=already-resolved");
  }

  if (parsed.mode === "suggested") {
    if (!match.suggestedPlayerId) {
      throw new Error("No hay jugador sugerido para aceptar.");
    }

    await insertResolvedStats({
      matchId: parsed.matchId,
      playerId: match.suggestedPlayerId,
      status: "resolved",
      statsOverrides: parsed,
    });
    revalidatePath(`/players/${match.suggestedPlayerId}`);
  } else if (parsed.mode === "existing") {
    if (!parsed.playerId) {
      throw new Error("Elegí un jugador para vincular.");
    }

    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.id, parsed.playerId))
      .limit(1);

    if (!existingPlayer || existingPlayer.ownerUserId !== user.id) {
      throw new Error("No se encontró el jugador elegido.");
    }

    await insertResolvedStats({
      matchId: parsed.matchId,
      playerId: existingPlayer.id,
      status: "resolved",
      statsOverrides: parsed,
    });
    revalidatePath(`/players/${existingPlayer.id}`);
  } else {
    if (!parsed.name) {
      throw new Error("Ingresá el nombre del jugador nuevo.");
    }

    const playerId = createId("player");
    await db.insert(players).values({
      id: playerId,
      ownerUserId: user.id,
      name: parsed.name,
      lastName: parsed.lastName || deriveLastName(parsed.name),
      nickname: parsed.nickname || null,
      jerseyNumber: parsed.jerseyNumber === undefined ? null : parsed.jerseyNumber,
    });

    await insertResolvedStats({
      matchId: parsed.matchId,
      playerId,
      status: "created",
      statsOverrides: parsed,
    });
    revalidatePath(`/players/${playerId}`);
  }

  revalidatePath("/import");
  revalidatePath("/roster");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/partidos");
  revalidatePath("/fixture");
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { games, playerGameStats, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { deleteGameFromGoogleCalendar, syncGameToGoogleCalendar } from "@/lib/google-calendar";
import { gameCategoryValues } from "@/lib/game-categories";

const updateGameSchema = z.object({
  gameId: z.string().min(1),
  date: z.string().min(1),
  tournamentId: z.string().trim().optional().transform((value) => value || null),
  category: z.enum(gameCategoryValues),
  phase: z.enum(["regular", "quarterfinal", "semifinal", "final"]),
});

export async function updateGameDetails(formData: FormData) {
  await requireAdmin();
  const parsed = updateGameSchema.parse(Object.fromEntries(formData));
  const date = new Date(parsed.date);

  if (Number.isNaN(date.getTime())) {
    redirect(`/partidos/${parsed.gameId}?error=invalid-date`);
  }

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, parsed.gameId))
    .limit(1);

  if (!game) {
    redirect("/partidos?error=not-found");
  }

  await db
    .update(games)
    .set({
      date,
      tournamentId: parsed.tournamentId,
      category: parsed.category,
      phase: parsed.phase,
      updatedAt: new Date(),
    })
    .where(and(eq(games.id, parsed.gameId), eq(games.ownerUserId, game.ownerUserId)));

  await syncGameToGoogleCalendar({
    ...game,
    date,
    tournamentId: parsed.tournamentId,
    category: parsed.category,
    phase: parsed.phase,
    updatedAt: new Date(),
  });

  revalidatePath("/partidos");
  revalidatePath(`/partidos/${parsed.gameId}`);
  revalidatePath("/fixture");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/partidos/${parsed.gameId}?message=updated`);
}

const deleteGameSchema = z.object({
  gameId: z.string().min(1),
});

export async function deleteGameDetails(formData: FormData) {
  await requireAdmin();
  const parsed = deleteGameSchema.parse(Object.fromEntries(formData));

  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, parsed.gameId))
    .limit(1);

  if (!game) {
    redirect("/partidos?error=not-found");
  }

  try {
    await deleteGameFromGoogleCalendar(game);
  } catch {
    // Keep the delete available even if Calendar auth is broken.
  }

  await db.delete(games).where(eq(games.id, parsed.gameId));

  revalidatePath("/partidos");
  revalidatePath(`/partidos/${parsed.gameId}`);
  revalidatePath("/fixture");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/partidos?message=deleted");
}

const updatePlayerGameStatSchema = z.object({
  playerGameStatId: z.string().min(1),
  playerId: z.string().min(1),
  minutes: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  points: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  fgMade: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  fgAtt: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  twoMade: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  twoAtt: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  threeMade: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  threeAtt: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  ftMade: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  ftAtt: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  offReb: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  defReb: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  assists: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  steals: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  blocks: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  turnovers: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  fouls: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().min(0).optional()),
  plusMinus: z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : value), z.coerce.number().int().optional()),
});

export async function updatePlayerGameStat(formData: FormData) {
  await requireAdmin();
  const parsed = updatePlayerGameStatSchema.parse(Object.fromEntries(formData));

  const [currentStat] = await db
    .select({ stat: playerGameStats, game: games })
    .from(playerGameStats)
    .innerJoin(games, eq(playerGameStats.gameId, games.id))
    .where(eq(playerGameStats.id, parsed.playerGameStatId))
    .limit(1);

  if (!currentStat) {
    redirect("/partidos?error=stat-not-found");
  }

  const [chosenPlayer] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, parsed.playerId), eq(players.ownerUserId, currentStat.game.ownerUserId)))
    .limit(1);

  if (!chosenPlayer) {
    redirect(`/partidos/${currentStat.game.id}?error=player-not-found`);
  }

  const statPayload = {
    playerId: chosenPlayer.id,
    minutes: parsed.minutes ?? currentStat.stat.minutes,
    points: parsed.points ?? currentStat.stat.points,
    fgMade: parsed.fgMade ?? currentStat.stat.fgMade,
    fgAtt: parsed.fgAtt ?? currentStat.stat.fgAtt,
    twoMade: parsed.twoMade ?? currentStat.stat.twoMade,
    twoAtt: parsed.twoAtt ?? currentStat.stat.twoAtt,
    threeMade: parsed.threeMade ?? currentStat.stat.threeMade,
    threeAtt: parsed.threeAtt ?? currentStat.stat.threeAtt,
    ftMade: parsed.ftMade ?? currentStat.stat.ftMade,
    ftAtt: parsed.ftAtt ?? currentStat.stat.ftAtt,
    offReb: parsed.offReb ?? currentStat.stat.offReb,
    defReb: parsed.defReb ?? currentStat.stat.defReb,
    assists: parsed.assists ?? currentStat.stat.assists,
    steals: parsed.steals ?? currentStat.stat.steals,
    blocks: parsed.blocks ?? currentStat.stat.blocks,
    turnovers: parsed.turnovers ?? currentStat.stat.turnovers,
    fouls: parsed.fouls ?? currentStat.stat.fouls,
    plusMinus: parsed.plusMinus ?? currentStat.stat.plusMinus,
    updatedAt: new Date(),
  };

  await db
    .update(playerGameStats)
    .set(statPayload)
    .where(eq(playerGameStats.id, parsed.playerGameStatId));

  revalidatePath(`/partidos/${currentStat.game.id}`);
  revalidatePath("/partidos");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/players/${currentStat.stat.playerId}`);
  if (currentStat.stat.playerId !== chosenPlayer.id) {
    revalidatePath(`/players/${chosenPlayer.id}`);
  }

  redirect(`/partidos/${currentStat.game.id}?message=stat-updated`);
}

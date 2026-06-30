"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { games, playerGameStatRevisions, playerGameStats, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createId } from "@/lib/ids";
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

const playerGameStatSnapshotSchema = z.object({
  playerId: z.string().min(1),
  minutes: z.number().int().min(0),
  points: z.number().int().min(0),
  fgMade: z.number().int().min(0),
  fgAtt: z.number().int().min(0),
  twoMade: z.number().int().min(0),
  twoAtt: z.number().int().min(0),
  threeMade: z.number().int().min(0),
  threeAtt: z.number().int().min(0),
  ftMade: z.number().int().min(0),
  ftAtt: z.number().int().min(0),
  offReb: z.number().int().min(0),
  defReb: z.number().int().min(0),
  assists: z.number().int().min(0),
  steals: z.number().int().min(0),
  blocks: z.number().int().min(0),
  turnovers: z.number().int().min(0),
  fouls: z.number().int().min(0),
  plusMinus: z.number().int(),
});

function snapshotPlayerGameStat(stat: typeof playerGameStats.$inferSelect) {
  return playerGameStatSnapshotSchema.parse({
    playerId: stat.playerId,
    minutes: stat.minutes,
    points: stat.points,
    fgMade: stat.fgMade,
    fgAtt: stat.fgAtt,
    twoMade: stat.twoMade,
    twoAtt: stat.twoAtt,
    threeMade: stat.threeMade,
    threeAtt: stat.threeAtt,
    ftMade: stat.ftMade,
    ftAtt: stat.ftAtt,
    offReb: stat.offReb,
    defReb: stat.defReb,
    assists: stat.assists,
    steals: stat.steals,
    blocks: stat.blocks,
    turnovers: stat.turnovers,
    fouls: stat.fouls,
    plusMinus: stat.plusMinus,
  });
}

function buildUpdatedStatPayload(stat: typeof playerGameStats.$inferSelect, playerId: string, parsed: z.infer<typeof updatePlayerGameStatSchema>) {
  return {
    playerId,
    minutes: parsed.minutes ?? stat.minutes,
    points: parsed.points ?? stat.points,
    fgMade: parsed.fgMade ?? stat.fgMade,
    fgAtt: parsed.fgAtt ?? stat.fgAtt,
    twoMade: parsed.twoMade ?? stat.twoMade,
    twoAtt: parsed.twoAtt ?? stat.twoAtt,
    threeMade: parsed.threeMade ?? stat.threeMade,
    threeAtt: parsed.threeAtt ?? stat.threeAtt,
    ftMade: parsed.ftMade ?? stat.ftMade,
    ftAtt: parsed.ftAtt ?? stat.ftAtt,
    offReb: parsed.offReb ?? stat.offReb,
    defReb: parsed.defReb ?? stat.defReb,
    assists: parsed.assists ?? stat.assists,
    steals: parsed.steals ?? stat.steals,
    blocks: parsed.blocks ?? stat.blocks,
    turnovers: parsed.turnovers ?? stat.turnovers,
    fouls: parsed.fouls ?? stat.fouls,
    plusMinus: parsed.plusMinus ?? stat.plusMinus,
  };
}

export async function updatePlayerGameStat(formData: FormData) {
  const user = await requireAdmin();
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
    ...buildUpdatedStatPayload(currentStat.stat, chosenPlayer.id, parsed),
    updatedAt: new Date(),
  };

  const previousSnapshot = snapshotPlayerGameStat(currentStat.stat);

  await db.delete(playerGameStatRevisions).where(eq(playerGameStatRevisions.playerGameStatId, currentStat.stat.id));
  await db.insert(playerGameStatRevisions).values({
    id: createId("stat-revision"),
    playerGameStatId: currentStat.stat.id,
    gameId: currentStat.game.id,
    playerId: currentStat.stat.playerId,
    snapshot: previousSnapshot,
    editedByUserId: user.id,
  });

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

const revertPlayerGameStatSchema = z.object({
  playerGameStatId: z.string().min(1),
});

export async function revertPlayerGameStatEdit(formData: FormData) {
  await requireAdmin();
  const parsed = revertPlayerGameStatSchema.parse(Object.fromEntries(formData));

  const [currentStat] = await db
    .select({ stat: playerGameStats, game: games })
    .from(playerGameStats)
    .innerJoin(games, eq(playerGameStats.gameId, games.id))
    .where(eq(playerGameStats.id, parsed.playerGameStatId))
    .limit(1);

  if (!currentStat) {
    redirect("/partidos?error=stat-not-found");
  }

  const [revision] = await db
    .select()
    .from(playerGameStatRevisions)
    .where(and(eq(playerGameStatRevisions.playerGameStatId, currentStat.stat.id), eq(playerGameStatRevisions.gameId, currentStat.game.id)))
    .limit(1);

  if (!revision) {
    redirect(`/partidos/${currentStat.game.id}?error=stat-history-missing`);
  }

  const snapshot = playerGameStatSnapshotSchema.parse(revision.snapshot);

  await db
    .update(playerGameStats)
    .set({
      playerId: snapshot.playerId,
      minutes: snapshot.minutes,
      points: snapshot.points,
      fgMade: snapshot.fgMade,
      fgAtt: snapshot.fgAtt,
      twoMade: snapshot.twoMade,
      twoAtt: snapshot.twoAtt,
      threeMade: snapshot.threeMade,
      threeAtt: snapshot.threeAtt,
      ftMade: snapshot.ftMade,
      ftAtt: snapshot.ftAtt,
      offReb: snapshot.offReb,
      defReb: snapshot.defReb,
      assists: snapshot.assists,
      steals: snapshot.steals,
      blocks: snapshot.blocks,
      turnovers: snapshot.turnovers,
      fouls: snapshot.fouls,
      plusMinus: snapshot.plusMinus,
      updatedAt: new Date(),
    })
    .where(eq(playerGameStats.id, currentStat.stat.id));

  await db.delete(playerGameStatRevisions).where(eq(playerGameStatRevisions.playerGameStatId, currentStat.stat.id));

  revalidatePath(`/partidos/${currentStat.game.id}`);
  revalidatePath("/partidos");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/players/${currentStat.stat.playerId}`);
  if (currentStat.stat.playerId !== snapshot.playerId) {
    revalidatePath(`/players/${snapshot.playerId}`);
  }

  redirect(`/partidos/${currentStat.game.id}?message=stat-reverted`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  playerGameStats,
  playerMatchReviews,
  players,
  user as userTable,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { deriveLastName } from "@/lib/player-name";

const playerSchema = z.object({
  name: z.string().trim().min(2),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
});

export async function createPlayer(formData: FormData) {
  const user = await requireAdmin();
  const parsed = playerSchema.parse(Object.fromEntries(formData));

  await db.insert(players).values({
    id: createId("player"),
    ownerUserId: user.id,
    name: parsed.name,
    lastName: parsed.lastName || deriveLastName(parsed.name),
    nickname: parsed.nickname || null,
    jerseyNumber:
      parsed.jerseyNumber === "" || parsed.jerseyNumber === undefined
        ? null
        : parsed.jerseyNumber,
  });

  revalidatePath("/roster");
}

const updatePlayerSchema = playerSchema.extend({
  playerId: z.string().min(1),
});

export async function updatePlayer(formData: FormData) {
  await requireAdmin();
  const parsed = updatePlayerSchema.parse(Object.fromEntries(formData));

  await db
    .update(players)
    .set({
      name: parsed.name,
      lastName: parsed.lastName || deriveLastName(parsed.name),
      nickname: parsed.nickname || null,
      jerseyNumber:
        parsed.jerseyNumber === "" || parsed.jerseyNumber === undefined
          ? null
          : parsed.jerseyNumber,
      updatedAt: new Date(),
    })
    .where(eq(players.id, parsed.playerId));

  revalidatePath("/roster");
  revalidatePath(`/players/${parsed.playerId}`);
}

const deletePlayerSchema = z.object({
  playerId: z.string().min(1),
});

export async function deletePlayer(formData: FormData) {
  await requireAdmin();
  const parsed = deletePlayerSchema.parse(Object.fromEntries(formData));

  await db.delete(players).where(eq(players.id, parsed.playerId));
  await db
    .update(userTable)
    .set({ playerId: null, onboarded: false, updatedAt: new Date() })
    .where(eq(userTable.playerId, parsed.playerId));

  revalidatePath("/roster");
  redirect("/roster?message=player-deleted");
}

const unifyPlayersSchema = z.object({
  sourcePlayerId: z.string().min(1),
  targetPlayerId: z.string().min(1),
});

export async function unifyPlayers(formData: FormData) {
  await requireAdmin();
  const parsed = unifyPlayersSchema.parse(Object.fromEntries(formData));

  if (parsed.sourcePlayerId === parsed.targetPlayerId) {
    redirect("/roster?message=same-player");
  }

  await db
    .update(playerGameStats)
    .set({ playerId: parsed.targetPlayerId, updatedAt: new Date() })
    .where(eq(playerGameStats.playerId, parsed.sourcePlayerId));
  await db
    .update(userTable)
    .set({ playerId: parsed.targetPlayerId, updatedAt: new Date() })
    .where(eq(userTable.playerId, parsed.sourcePlayerId));
  await db
    .update(playerMatchReviews)
    .set({ suggestedPlayerId: parsed.targetPlayerId, updatedAt: new Date() })
    .where(eq(playerMatchReviews.suggestedPlayerId, parsed.sourcePlayerId));
  await db
    .update(playerMatchReviews)
    .set({ createdPlayerId: parsed.targetPlayerId, updatedAt: new Date() })
    .where(eq(playerMatchReviews.createdPlayerId, parsed.sourcePlayerId));
  await db.delete(players).where(eq(players.id, parsed.sourcePlayerId));

  revalidatePath("/roster");
  revalidatePath(`/players/${parsed.targetPlayerId}`);
  redirect("/roster?message=players-unified");
}

const bulkUnifyPlayersSchema = z.object({
  selectedPlayerIds: z.string().min(1),
  finalName: z.string().trim().min(2),
  finalLastName: z.string().trim().optional(),
  finalNickname: z.string().trim().optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
});

export async function bulkUnifyPlayers(formData: FormData) {
  await requireAdmin();
  const parsed = bulkUnifyPlayersSchema.parse(Object.fromEntries(formData));
  const selectedPlayerIds = parsed.selectedPlayerIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (selectedPlayerIds.length < 2) {
    redirect("/roster?message=select-multiple");
  }

  const targetPlayerId = selectedPlayerIds[0];
  const sourcePlayerIds = selectedPlayerIds.slice(1);

  await db
    .update(players)
    .set({
      name: parsed.finalName,
      lastName: parsed.finalLastName || deriveLastName(parsed.finalName),
      nickname: parsed.finalNickname || null,
      jerseyNumber:
        parsed.jerseyNumber === "" || parsed.jerseyNumber === undefined
          ? null
          : parsed.jerseyNumber,
      updatedAt: new Date(),
    })
    .where(eq(players.id, targetPlayerId));

  for (const sourcePlayerId of sourcePlayerIds) {
    await db
      .update(playerGameStats)
      .set({ playerId: targetPlayerId, updatedAt: new Date() })
      .where(eq(playerGameStats.playerId, sourcePlayerId));
    await db
      .update(userTable)
      .set({ playerId: targetPlayerId, updatedAt: new Date() })
      .where(eq(userTable.playerId, sourcePlayerId));
    await db
      .update(playerMatchReviews)
      .set({ suggestedPlayerId: targetPlayerId, updatedAt: new Date() })
      .where(eq(playerMatchReviews.suggestedPlayerId, sourcePlayerId));
    await db
      .update(playerMatchReviews)
      .set({ createdPlayerId: targetPlayerId, updatedAt: new Date() })
      .where(eq(playerMatchReviews.createdPlayerId, sourcePlayerId));
    await db.delete(players).where(eq(players.id, sourcePlayerId));
  }

  revalidatePath("/roster");
  revalidatePath(`/players/${targetPlayerId}`);
  redirect("/roster?message=players-unified");
}

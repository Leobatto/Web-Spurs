"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { games } from "@/db/schema";
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

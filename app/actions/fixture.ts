"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { games } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  deleteGameFromGoogleCalendar,
  isGoogleAuthError,
  syncAllGamesToGoogleCalendar,
  syncGameToGoogleCalendar,
} from "@/lib/google-calendar";
import { createId } from "@/lib/ids";

const youtubeUrlSchema = z.string().trim().refine((value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.hostname === "youtu.be" || url.hostname.endsWith("youtube.com");
  } catch {
    return false;
  }
}, "Ingresá una URL válida de YouTube.");

const fixtureGameSchema = z.object({
  opponent: z.string().trim().min(2),
  category: z.enum(["PM", "M"]),
  date: z.string().min(1),
  location: z.string().trim().optional(),
  isHome: z.string().optional(),
  finalScore: z.string().trim().optional(),
  youtubeUrl: youtubeUrlSchema,
});

export async function createFixtureGame(formData: FormData) {
  const user = await requireAdmin();
  const parsed = fixtureGameSchema.parse(Object.fromEntries(formData));
  const game = {
    id: createId("game"),
    ownerUserId: user.id,
    category: parsed.category,
    opponent: parsed.opponent,
    date: new Date(parsed.date),
    isHome: parsed.isHome === "on",
    location: parsed.location || null,
    finalScore: parsed.finalScore || null,
    googleCalendarEventId: null,
    q1Spurs: null,
    q1Rival: null,
    q2Spurs: null,
    q2Rival: null,
    q3Spurs: null,
    q3Rival: null,
    q4Spurs: null,
    q4Rival: null,
    summaryWhatsapp: null,
    validationNotes: null,
    youtubeUrl: parsed.youtubeUrl || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies typeof games.$inferInsert;

  await db.insert(games).values(game);
  try {
    await syncGameToGoogleCalendar(game as typeof games.$inferSelect);
  } catch {
    // Fixture creation should not fail because the external calendar needs reconnecting.
  }

  revalidatePath("/fixture");
  revalidatePath("/dashboard");
}

const updateFixtureVideoSchema = z.object({
  gameId: z.string().min(1),
  youtubeUrl: youtubeUrlSchema,
});

export async function updateFixtureVideo(formData: FormData) {
  await requireAdmin();
  const parsed = updateFixtureVideoSchema.parse(Object.fromEntries(formData));

  await db
    .update(games)
    .set({
      youtubeUrl: parsed.youtubeUrl || null,
      updatedAt: new Date(),
    })
    .where(eq(games.id, parsed.gameId));

  revalidatePath("/fixture");
  revalidatePath(`/games/${parsed.gameId}`);
}

const deleteFixtureGameSchema = z.object({
  gameId: z.string().min(1),
});

export async function deleteFixtureGame(formData: FormData) {
  await requireAdmin();
  const parsed = deleteFixtureGameSchema.parse(Object.fromEntries(formData));
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.id, parsed.gameId))
    .limit(1);

  if (game) {
    try {
      await deleteGameFromGoogleCalendar(game);
    } catch {
      // Keep local delete available even if Google Calendar auth expired.
    }
    await db.delete(games).where(eq(games.id, parsed.gameId));
  }

  revalidatePath("/fixture");
  revalidatePath("/dashboard");
}

export async function syncFixtureWithGoogleCalendar() {
  await requireAdmin();

  try {
    await syncAllGamesToGoogleCalendar();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isGoogleAuthError(error)) {
      redirect("/fixture?sync=calendar-auth-expired");
    }

    if (message.includes("Calendar API has not been used") || message.includes("disabled")) {
      redirect("/fixture?sync=calendar-api-disabled");
    }

    if (message.includes("Not Found")) {
      redirect("/fixture?sync=calendar-not-found");
    }

    if (message.includes("insufficient") || message.includes("forbidden")) {
      redirect("/fixture?sync=calendar-permission-denied");
    }

    redirect("/fixture?sync=calendar-error");
  }

  revalidatePath("/fixture");
  redirect("/fixture?sync=ok");
}

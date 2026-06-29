"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { players, user as userTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deriveLastName } from "@/lib/player-name";
import { fileToDataUrl } from "@/lib/photo-upload";

const accountSchema = z.object({
  phone: z.string().trim().min(8),
  emailReports: z.string().optional(),
});

export async function updateOwnAccount(formData: FormData) {
  const user = await requireUser();
  const parsed = accountSchema.parse(Object.fromEntries(formData));

  await db
    .update(userTable)
    .set({
      phone: parsed.phone,
      emailReports: parsed.emailReports === "on",
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, user.id));

  revalidatePath("/account");
}

const playerProfileSchema = z.object({
  name: z.string().trim().min(2),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
});

export async function updateOwnPlayerProfile(formData: FormData) {
  const user = await requireUser();

  if (!user.playerId) {
    return;
  }

  const photoUrl = await fileToDataUrl(formData.get("photo"));
  const parsed = playerProfileSchema.parse(Object.fromEntries(formData));
  const [currentPlayer] = await db.select().from(players).where(eq(players.id, user.playerId)).limit(1);

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
      photoUrl: photoUrl ?? currentPlayer?.photoUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(players.id, user.playerId));

  revalidatePath("/account");
  revalidatePath(`/players/${user.playerId}`);
}

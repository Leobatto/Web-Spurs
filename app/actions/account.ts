"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { players, user as userTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";

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
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
});

export async function updateOwnPlayerProfile(formData: FormData) {
  const user = await requireUser();

  if (!user.playerId) {
    return;
  }

  const parsed = playerProfileSchema.parse(Object.fromEntries(formData));

  await db
    .update(players)
    .set({
      name: parsed.name,
      jerseyNumber:
        parsed.jerseyNumber === "" || parsed.jerseyNumber === undefined
          ? null
          : parsed.jerseyNumber,
      updatedAt: new Date(),
    })
    .where(eq(players.id, user.playerId));

  revalidatePath("/account");
  revalidatePath(`/players/${user.playerId}`);
}

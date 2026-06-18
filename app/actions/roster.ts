"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createId } from "@/lib/ids";

const playerSchema = z.object({
  name: z.string().trim().min(2),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
});

export async function createPlayer(formData: FormData) {
  const user = await requireAdmin();
  const parsed = playerSchema.parse(Object.fromEntries(formData));

  await db.insert(players).values({
    id: createId("player"),
    ownerUserId: user.id,
    name: parsed.name,
    jerseyNumber:
      parsed.jerseyNumber === "" || parsed.jerseyNumber === undefined
        ? null
        : parsed.jerseyNumber,
  });

  revalidatePath("/roster");
}

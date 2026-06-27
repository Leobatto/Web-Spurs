"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { requireWrite } from "@/lib/auth";
import { createId } from "@/lib/ids";

const tournamentSchema = z.object({
  name: z.string().trim().min(2),
});

export async function createTournament(formData: FormData) {
  const user = await requireWrite();
  const parsed = tournamentSchema.parse(Object.fromEntries(formData));

  const [existing] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.ownerUserId, user.id), eq(tournaments.name, parsed.name)))
    .limit(1);

  if (existing?.name === parsed.name) {
    redirect("/import?message=tournament-exists");
  }

  await db.insert(tournaments).values({
    id: createId("tournament"),
    ownerUserId: user.id,
    name: parsed.name,
  });

  revalidatePath("/import");
  redirect("/import?message=tournament-created");
}

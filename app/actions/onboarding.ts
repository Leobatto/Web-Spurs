"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const onboardingSchema = z.object({
  playerId: z.string().min(1),
  phone: z.string().trim().min(8),
  emailReports: z.string().optional(),
});

export async function completeOnboarding(formData: FormData) {
  const currentUser = await requireUser();
  const parsed = onboardingSchema.parse(Object.fromEntries(formData));

  await db
    .update(userTable)
    .set({
      playerId: parsed.playerId,
      phone: parsed.phone,
      emailReports: parsed.emailReports === "on",
      onboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, currentUser.id));

  redirect("/me");
}

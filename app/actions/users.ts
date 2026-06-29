"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createId } from "@/lib/ids";

const roleSchema = z.enum(["admin", "write", "read"]);

const inviteSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: roleSchema,
});

export async function inviteUser(formData: FormData) {
  await requireAdmin();
  const parsed = inviteSchema.parse(Object.fromEntries(formData));
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const email = parsed.email.toLowerCase();

  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  try {
    if (!existing) {
      await db.insert(userTable).values({
        id: createId("user"),
        name: parsed.name,
        email,
        emailVerified: false,
        role: parsed.role,
        emailReports: true,
        onboarded: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(userTable)
        .set({ name: parsed.name, role: parsed.role, emailVerified: false, updatedAt: new Date() })
        .where(eq(userTable.id, existing.id));
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${baseUrl}/reset-password`,
      },
    });
  } catch (error) {
    console.error("Invite user failed", error);
    redirect("/users?message=invite-failed");
  }

  revalidatePath("/users");
  redirect("/users?message=invited");
}

const roleUpdateSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export async function updateUserRole(formData: FormData) {
  await requireAdmin();
  const parsed = roleUpdateSchema.parse(Object.fromEntries(formData));

  await db
    .update(userTable)
    .set({ role: parsed.role, updatedAt: new Date() })
    .where(eq(userTable.id, parsed.userId));

  revalidatePath("/users");
}

const resetSchema = z.object({
  email: z.string().trim().email(),
});

export async function adminRequestPasswordReset(formData: FormData) {
  await requireAdmin();
  const parsed = resetSchema.parse(Object.fromEntries(formData));
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  await auth.api.requestPasswordReset({
    body: {
      email: parsed.email,
      redirectTo: `${baseUrl.replace(/\/$/, "")}/reset-password`,
    },
  });

  revalidatePath("/users");
  redirect("/users?message=reset-sent");
}

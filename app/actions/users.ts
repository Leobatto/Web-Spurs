"use server";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

const roleSchema = z.enum(["admin", "write", "read"]);

const inviteSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: roleSchema,
});

export async function inviteUser(formData: FormData) {
  await requireAdmin();
  const parsed = inviteSchema.parse(Object.fromEntries(formData));
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, parsed.email))
    .limit(1);

  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name: parsed.name,
        email: parsed.email,
        password: crypto.randomBytes(16).toString("hex"),
      },
      headers: await headers(),
    });
  } else {
    await db
      .update(userTable)
      .set({ name: parsed.name, updatedAt: new Date() })
      .where(eq(userTable.id, existing.id));
  }

  const [userRow] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, parsed.email))
    .limit(1);

  if (!userRow) {
    redirect("/users?message=invite-failed");
  }

  await db
    .update(userTable)
    .set({ role: parsed.role, emailVerified: false, updatedAt: new Date() })
    .where(eq(userTable.id, userRow.id));

  await auth.api.requestPasswordReset({
    body: {
      email: parsed.email,
      redirectTo: `${baseUrl.replace(/\/$/, "")}/reset-password`,
    },
  });

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

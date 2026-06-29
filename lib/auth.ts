import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getResend } from "@/lib/email";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "leobatto@gmail.com";

function normalizeRole(role: string) {
  if (role === "admin" || role === "write" || role === "read") {
    return role;
  }

  return "read";
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

async function sendAuthEmail(user: { email: string }, url: string, subject: string, intro: string) {
  const resend = getResend();

  if (!resend) {
    console.log(`${subject} for ${user.email}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Spurs Stats <reportes@spurs.leobatto.com>",
    to: user.email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h1 style="margin:0 0 12px">JP Spurs</h1>
        <p>${intro}</p>
        <p><a href="${url}">Abrir enlace</a></p>
        <p>Si no esperabas este mensaje, ignoralo.</p>
      </div>
    `,
  });
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "H84nYj9Qm2bP0xLv7sAe4rT6kZc1uWf3",
  baseURL: {
    allowedHosts: [
      "localhost:3000",
      "127.0.0.1:3000",
      "jp-spurs-web.vercel.app",
      "*.vercel.app",
      "spurs.leobatto.com",
      "spurs.vercel.com",
    ],
    fallback: process.env.BETTER_AUTH_URL ?? "https://jp-spurs-web.vercel.app",
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail(user, url, "JP Spurs: configurá tu acceso", "Recibiste una invitación o una solicitud para configurar tu acceso.");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(user, url, "JP Spurs: verificá tu email", "Confirmá tu email para empezar a usar JP Spurs.");
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  plugins: [nextCookies()],
});

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  const [dbUser] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!dbUser) {
    return null;
  }

  return {
    ...dbUser,
    role: dbUser.email === ADMIN_EMAIL ? "admin" : normalizeRole(dbUser.role),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireAppUser() {
  const user = await requireUser();

  if (user.role === "read") {
    redirect("/dashboard");
  }

  return user;
}

export async function getDashboardOwnerUserId(userId: string, role: string) {
  if (role !== "read") {
    return userId;
  }

  const [mostActiveOwner] = await db
    .select({ id: schema.games.ownerUserId })
    .from(schema.games)
    .groupBy(schema.games.ownerUserId)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(1);

  if (mostActiveOwner?.id) {
    return mostActiveOwner.id;
  }

  const [owner] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, ADMIN_EMAIL))
    .limit(1);

  return owner?.id ?? userId;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/me");
  }

  return user;
}

export async function requireWrite() {
  const user = await requireUser();

  if (user.role === "read") {
    redirect("/me");
  }

  return user;
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getResend } from "@/lib/email";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "leobatto@gmail.com";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "H84nYj9Qm2bP0xLv7sAe4rT6kZc1uWf3",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const resend = getResend();

      if (!resend) {
        console.log(`Reset password for ${user.email}: ${url}`);
        return;
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Spurs Stats <reportes@spurs.leobatto.com>",
        to: user.email,
        subject: "JP Spurs: restablecé tu contraseña",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
            <h1 style="margin:0 0 12px">JP Spurs</h1>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p><a href="${url}">Restablecer contraseña</a></p>
            <p>Si no fuiste vos, ignorá este mensaje.</p>
          </div>
        `,
      });
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
    role: dbUser.email === ADMIN_EMAIL ? "admin" : dbUser.role,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
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

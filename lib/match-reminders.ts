import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { playerMatchReviews } from "@/db/schema";
import { getResend } from "@/lib/email";
import { ADMIN_EMAIL } from "@/lib/auth";

export async function sendPendingMatchReminders() {
  const resend = getResend();

  if (!resend) {
    return { sent: 0, skipped: "Falta RESEND_API_KEY." };
  }

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const pending = await db
    .select()
    .from(playerMatchReviews)
    .where(
      and(
        eq(playerMatchReviews.status, "pending"),
        isNull(playerMatchReviews.reminderSentAt),
        lt(playerMatchReviews.createdAt, cutoff),
      ),
    );

  if (pending.length === 0) {
    return { sent: 0, pending: 0 };
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Spurs Stats <reportes@spurs.leobatto.com>",
    to: ADMIN_EMAIL,
    subject: "Spurs Stats: coincidencias pendientes de jugadores",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h1>Coincidencias pendientes</h1>
        <p>Hay ${pending.length} coincidencia(s) de jugadores sin resolver hace mas de 3 dias.</p>
        <p>Ingresá a la pantalla de importación para vincularlas o crear fichas nuevas.</p>
      </div>
    `,
  });

  const now = new Date();
  for (const match of pending) {
    await db
      .update(playerMatchReviews)
      .set({ reminderSentAt: now, updatedAt: now })
      .where(eq(playerMatchReviews.id, match.id));
  }

  return { sent: pending.length, pending: pending.length };
}

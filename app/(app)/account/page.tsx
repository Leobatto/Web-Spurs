import { eq } from "drizzle-orm";
import { LinkGoogleAccountButton } from "@/components/link-google-account-button";
import { db } from "@/db";
import { account } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  const linkedAccounts = await db
    .select()
    .from(account)
    .where(eq(account.userId, user.id));
  const googleLinked = linkedAccounts.some((row) => row.providerId === "google");
  const googleCalendarLinked = linkedAccounts.some(
    (row) =>
      row.providerId === "google" &&
      row.scope?.includes("https://www.googleapis.com/auth/calendar.events"),
  );

  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Cuenta</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Autogestión</h1>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p><strong>Email:</strong> {user.email}</p>
        <p className="mt-2"><strong>Teléfono:</strong> {user.phone ?? "pendiente"}</p>
        <p className="mt-2"><strong>Reportes:</strong> {user.emailReports ? "activados" : "desactivados"}</p>
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="font-semibold">Google</p>
          <p className="mt-1 text-sm text-zinc-500">
            {googleLinked
              ? "Tu usuario ya está vinculado con Google."
              : "Vinculá Google para poder entrar también con tu cuenta Google."}
          </p>
          {!googleLinked ? <div className="mt-4"><LinkGoogleAccountButton /></div> : null}
        </div>
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="font-semibold">Google Calendar</p>
          <p className="mt-1 text-sm text-zinc-500">
            {googleCalendarLinked
              ? "Tu cuenta Google ya autorizó crear eventos en Calendar."
              : "Autorizá Calendar para que el fixture cree eventos en el calendario embebido."}
          </p>
          {!googleCalendarLinked ? (
            <div className="mt-4">
              <LinkGoogleAccountButton
                calendarAccess
                label="Autorizar Google Calendar"
              />
            </div>
          ) : null}
        </div>
        <p className="mt-5 text-sm text-zinc-500">La edición de cuenta queda como siguiente paso después de cerrar auth y onboarding.</p>
      </div>
    </div>
  );
}

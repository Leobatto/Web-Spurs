import { eq } from "drizzle-orm";
import { updateOwnAccount, updateOwnPlayerProfile } from "@/app/actions/account";
import { LinkGoogleAccountButton } from "@/components/link-google-account-button";
import { db } from "@/db";
import { account, players } from "@/db/schema";
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
  const [linkedPlayer] = user.playerId
    ? await db.select().from(players).where(eq(players.id, user.playerId)).limit(1)
    : [];

  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Cuenta</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Autogestión</h1>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p><strong>Email:</strong> {user.email}</p>
        <form action={updateOwnAccount} className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <h2 className="font-semibold">Mis datos</h2>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Teléfono
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
              defaultValue={user.phone ?? ""}
              name="phone"
              required
            />
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-zinc-700">
            <input defaultChecked={user.emailReports} name="emailReports" type="checkbox" />
            Recibir reportes por email
          </label>
          <button className="mt-5 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
            Guardar mis datos
          </button>
        </form>
        {linkedPlayer ? (
          <form action={updateOwnPlayerProfile} className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
            <h2 className="font-semibold">Mi ficha de jugador</h2>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Nombre deportivo
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={linkedPlayer.name}
                name="name"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Apellido
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={linkedPlayer.lastName ?? ""}
                name="lastName"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Número de camiseta
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={linkedPlayer.jerseyNumber ?? ""}
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
              />
            </label>
            <button className="mt-5 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
              Guardar ficha
            </button>
          </form>
        ) : null}
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

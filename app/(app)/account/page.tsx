import Image from "next/image";
import { eq } from "drizzle-orm";
import { updateOwnAccount, updateOwnPlayerProfile } from "@/app/actions/account";
import { LinkGoogleAccountButton } from "@/components/link-google-account-button";
import { db } from "@/db";
import { account, players } from "@/db/schema";
import { requireAppUser } from "@/lib/auth";
import { formatPlayerDisplayName } from "@/lib/player-name";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAppUser();
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
      <h1 className="mt-3 text-4xl font-black tracking-tight">Mi perfil</h1>
      <p className="mt-3 text-sm text-zinc-600">Ajustá tus datos, tu ficha deportiva y las conexiones con Google desde un solo lugar.</p>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p><strong>Email del staff:</strong> {user.email}</p>
        <form action={updateOwnAccount} className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <h2 className="font-semibold">Datos del perfil</h2>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Teléfono de contacto
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
              defaultValue={user.phone ?? ""}
              name="phone"
              required
            />
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-zinc-700">
            <input defaultChecked={user.emailReports} name="emailReports" type="checkbox" />
            Recibir reportes por mail
          </label>
          <button className="mt-5 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
            Guardar perfil
          </button>
        </form>
        {linkedPlayer ? (
          <form action={updateOwnPlayerProfile} className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4" encType="multipart/form-data">
            <h2 className="font-semibold">{formatPlayerDisplayName(linkedPlayer)}</h2>
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                {linkedPlayer.photoUrl ? (
                  <Image alt={formatPlayerDisplayName(linkedPlayer)} className="h-full w-full object-cover" height={64} src={linkedPlayer.photoUrl} width={64} />
                ) : null}
              </div>
              <label className="block flex-1 text-sm font-medium text-zinc-700">
                Foto
                <input className="mt-2 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3" accept="image/*" name="photo" type="file" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Nombre en cancha
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
              Apodo
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={linkedPlayer.nickname ?? ""}
                name="nickname"
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
              Guardar ficha deportiva
            </button>
          </form>
        ) : null}
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="font-semibold">Google y Calendar</p>
          <p className="mt-1 text-sm text-zinc-500">
            {googleLinked
              ? "Tu cuenta ya está vinculada con Google."
              : "Conectá Google para entrar también con esa cuenta."}
          </p>
          {!googleLinked ? <div className="mt-4"><LinkGoogleAccountButton /></div> : null}
        </div>
        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
          <p className="font-semibold">Google Calendar</p>
          <p className="mt-1 text-sm text-zinc-500">
            {googleCalendarLinked
              ? "Tu cuenta ya puede crear eventos en Calendar."
              : "Autorizá Calendar para que el fixture publique los partidos en tu calendario."}
          </p>
          {!googleCalendarLinked ? (
            <div className="mt-4">
              <LinkGoogleAccountButton
                calendarAccess
                label="Autorizar Calendar"
              />
            </div>
          ) : null}
        </div>
        <p className="mt-5 text-sm text-zinc-500">Acá dejamos la autogestión básica; el resto del flujo vive en onboarding y el tablero.</p>
      </div>
    </div>
  );
}

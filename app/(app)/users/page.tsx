import { desc } from "drizzle-orm";
import { adminRequestPasswordReset, inviteUser, updateUserRole } from "@/app/actions/users";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function messageText(message?: string) {
  if (message === "invited") return "Acceso creado y enlace enviado.";
  if (message === "reset-sent") return "Se envió el enlace para reponer acceso.";
  if (message === "invite-failed") return "No pudimos completar la invitación.";
  return null;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const flash = messageText(params.message);
  const users = await db.select().from(user).orderBy(desc(user.createdAt));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Administración</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Accesos del vestuario</h1>
        <p className="mt-3 max-w-2xl text-zinc-600">
          Sumá gente al staff, definí permisos y reponé accesos desde un solo tablero.
        </p>
      </div>

      {flash ? <p className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">{flash}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form action={inviteUser} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Sumar acceso</h2>
          <label className="mt-5 block text-sm font-medium text-zinc-700">
            Nombre de cancha
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="name" required />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Mail
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="email" type="email" required />
          </label>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Nivel de acceso
            <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" name="role" defaultValue="read" required>
              <option value="admin">Administrador</option>
              <option value="write">Edición</option>
              <option value="read">Lectura</option>
            </select>
          </label>
          <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white" type="submit">
            Enviar invitación
          </button>
        </form>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <h2 className="text-xl font-bold">Cuentas activas</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {users.map((item) => (
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between" key={item.id}>
                <div>
                  <p className="font-semibold text-zinc-950">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.email}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">{item.role}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input name="userId" type="hidden" value={item.id} />
                    <select className="rounded-xl border border-zinc-200 px-4 py-2 text-sm" name="role" defaultValue={item.role}>
                      <option value="admin">Administrador</option>
                      <option value="write">Edición</option>
                      <option value="read">Lectura</option>
                    </select>
                    <button className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold" type="submit">
                      Guardar rol
                    </button>
                  </form>
                  <form action={adminRequestPasswordReset}>
                    <input name="email" type="hidden" value={item.email} />
                    <button className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                      Reponer acceso
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const result = await authClient.resetPassword({ newPassword: password, token });

    setPending(false);

    if (result.error) {
      setStatus(result.error.message ?? "No se pudo cambiar la contraseña.");
      return;
    }

    router.push("/sign-in?message=password-reset");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Seguridad</p>
      <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Definir nueva contraseña</h1>
      <label className="mt-6 block text-sm font-medium text-zinc-700">
        Nueva contraseña
        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/20" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:opacity-60" disabled={pending || !token} type="submit">
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
      {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
    </form>
  );
}

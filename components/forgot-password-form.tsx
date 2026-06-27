"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setPending(false);
    setStatus(result.error?.message ?? "Si el email existe, vas a recibir un enlace para restablecer la contraseña.");
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Recuperación</p>
      <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Olvidé mi contraseña</h1>
      <label className="mt-6 block text-sm font-medium text-zinc-700">
        Email
        <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/20" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <button className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Enviando..." : "Enviar enlace"}
      </button>
      {status ? <p className="mt-4 text-sm text-zinc-600">{status}</p> : null}
    </form>
  );
}

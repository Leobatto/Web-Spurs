"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? email);

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "No se pudo completar la operación.");
      return;
    }

    router.push(mode === "sign-in" ? "/dashboard" : "/onboarding");
    router.refresh();
  }

  async function google() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Spurs Stats
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-950">
          {mode === "sign-in" ? "Ingresar" : "Crear cuenta"}
        </h1>
      </div>
      <form action={submit} className="space-y-4">
        {mode === "sign-up" ? (
          <label className="block text-sm font-medium text-zinc-700">
            Nombre
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950"
              name="name"
              required
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-zinc-700">
          Email
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Contraseña
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Procesando..." : mode === "sign-in" ? "Entrar" : "Registrarme"}
        </button>
      </form>
      <button
        className="mt-3 w-full rounded-xl border border-zinc-200 px-4 py-3 font-semibold text-zinc-950"
        onClick={google}
        type="button"
      >
        Continuar con Google
      </button>
    </div>
  );
}

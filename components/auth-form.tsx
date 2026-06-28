"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

const guestEmail = process.env.NEXT_PUBLIC_GUEST_EMAIL ?? "juanmanuelraggi@gmail.com";
const guestPassword = process.env.NEXT_PUBLIC_GUEST_PASSWORD ?? "Guest1234!";

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

    router.push(mode === "sign-in" ? "/dashboard" : "/dashboard");
    router.refresh();
  }

  async function google() {
    setPending(true);
    setError(null);

    try {
      const callbackURL = `${window.location.origin}/dashboard`;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message ?? "No se pudo iniciar sesión con Google.");
        return;
      }

      if (result.data?.url) {
        window.location.assign(result.data.url);
      }
    } catch {
      setError("No se pudo iniciar sesión con Google.");
    } finally {
      setPending(false);
    }
  }

  async function guest() {
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: guestEmail,
        password: guestPassword,
      });

      if (result.error) {
        setError(result.error.message ?? "No se pudo ingresar como invitado.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo ingresar como invitado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-black/10">
      <div className="bg-zinc-950 p-8 text-white">
        <div className="flex items-center gap-3">
          <Image alt="JP Spurs" src="/logo-spurs.png" width={34} height={34} className="rounded-full bg-white p-1" />
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">JP Spurs</p>
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">
          {mode === "sign-in" ? "Entrar al vestuario" : "Pedir acceso"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {mode === "sign-in"
            ? "Accedé al tablero, revisá el plantel y seguí la producción del equipo."
            : "Sumá tu cuenta para entrar al tablero y trabajar con el resto del staff."}
        </p>
      </div>
      <div className="p-8">
        <form action={submit} className="space-y-4">
        {mode === "sign-up" ? (
          <label className="block text-sm font-medium text-zinc-700">
            Nombre deportivo
            <input
              className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/20"
              name="name"
              required
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium text-zinc-700">
          Email
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Contraseña
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            name="password"
            type="password"
            minLength={8}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Procesando..." : mode === "sign-in" ? "Entrar al tablero" : "Crear acceso"}
        </button>
        </form>
        <button
          className="mt-3 w-full rounded-xl border border-zinc-200 px-4 py-3 font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          onClick={google}
          disabled={pending}
          type="button"
        >
          {pending ? "Redirigiendo..." : "Entrar con Google"}
        </button>
        {mode === "sign-in" ? (
          <button
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            onClick={guest}
            disabled={pending}
            type="button"
          >
            {pending ? "Ingresando..." : "Entrar como invitado"}
          </button>
        ) : null}
        {mode === "sign-in" ? (
          <Link className="mt-4 block text-center text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2" href="/forgot-password">
            Necesito recuperar acceso
          </Link>
        ) : null}
      </div>
    </div>
  );
}

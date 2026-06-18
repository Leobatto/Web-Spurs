import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-amber-300">
          JP Spurs
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">
          Estadísticas desde planillas PDF, revisadas y enviadas a cada jugador.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Cargá partidos PM y M, corregí el box score antes de guardarlo y generá reportes individuales por email.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link className="rounded-full bg-white px-6 py-3 font-semibold text-zinc-950" href="/sign-in">
            Ingresar
          </Link>
          <Link className="rounded-full border border-white/20 px-6 py-3 font-semibold" href="/sign-up">
            Crear cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}

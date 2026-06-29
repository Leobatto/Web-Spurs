import Link from "next/link";
import Image from "next/image";
import { asc, desc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { games } from "@/db/schema";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function Home() {
  const now = new Date();
  const [nextMatch] = await db.select().from(games).where(gte(games.date, now)).orderBy(asc(games.date)).limit(1);
  const [lastMatch] = await db.select().from(games).where(lt(games.date, now)).orderBy(desc(games.date)).limit(1);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,206,214,0.12),_transparent_34%),linear-gradient(180deg,#0a0a0a_0%,#141414_54%,#bdb8ae_54%,#bdb8ae_100%)] text-zinc-950">
      <main className="mx-auto grid min-h-screen max-w-7xl items-start gap-12 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-16">
        <section className="space-y-8 text-white lg:pr-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur">
            <Image alt="JP Spurs" src="/logo-spurs.png" width={24} height={24} className="rounded-full bg-white p-0.5" />
            JP Spurs HQ
          </div>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.45em] text-zinc-400">Vestuario digital</p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">
              La pizarra de los JP Spurs
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 lg:text-zinc-400">
              Centralizá estadísticas, torneos y multimedia en un panel pensado para el banco: rápido, claro y con la identidad Spurs bien marcada.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950" href="/sign-in">
              Entrar al vestuario
            </Link>
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[#a8a196]/30 blur-3xl" />
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 text-zinc-950 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Agenda</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Próximo y último partido</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Próximo partido</p>
                {nextMatch ? (
                  <div className="mt-3 space-y-1 text-sm text-zinc-700">
                    <p className="text-base font-semibold text-zinc-950">{formatDateTime(nextMatch.date)}</p>
                    <p>Rival: {nextMatch.opponent}</p>
                    <p>Donde: {nextMatch.location ?? (nextMatch.isHome ? "Local" : "Visitante")}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">No hay próximos partidos cargados.</p>
                )}
              </div>
              <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Último partido jugado</p>
                {lastMatch ? (
                  <div className="mt-3 space-y-1 text-sm text-zinc-700">
                    <p className="text-base font-semibold text-zinc-950">{formatDate(lastMatch.date)}</p>
                    <p>Rival: {lastMatch.opponent}</p>
                    <p>Resultado: {lastMatch.finalScore ?? "Pendiente"}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">No hay partidos jugados cargados.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

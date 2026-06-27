import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,206,214,0.18),_transparent_32%),linear-gradient(180deg,#0a0a0a_0%,#141414_60%,#f3f1ec_60%,#f3f1ec_100%)] text-white">
      <main className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-16">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur">
            <Image alt="JP Spurs" src="/logo-spurs.png" width={24} height={24} className="rounded-full bg-white p-0.5" />
            Spurs Stats Platform
          </div>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.45em] text-zinc-400">San Antonio Spurs vibes</p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white sm:text-7xl">
              El centro de mando de tus partidos, planillas y jugadores.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Cargá PDFs en lote, armá torneos, seguí récords por jugador y ordená todo con una experiencia rápida, oscura y lista para el banco.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="rounded-full bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950" href="/sign-in">
              Ingresar
            </Link>
            <Link className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950" href="/sign-up">
              Crear cuenta
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["PDF batch", "Cargá múltiples planillas"],
              ["Torneos", "Separá por temporada"],
              ["Playbook", "Jugadas en vivo"],
            ].map(([title, text]) => (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur" key={title}>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[#c4ced6]/20 blur-3xl" />
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 text-zinc-950 shadow-2xl shadow-black/20 sm:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Dashboard</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Todo lo importante, de un vistazo</h2>
              </div>
              <div className="rounded-2xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white">Live</div>
            </div>
            <div className="mt-5 grid gap-4">
              {[
                ["Partidos procesados", "PDF → stats → tablero"],
                ["Récords", "Puntos, rebotes y asistencias"],
                ["Usuarios", "Admin, escritura, lectura"],
              ].map(([title, text]) => (
                <div className="rounded-3xl border border-zinc-100 bg-zinc-50 p-4 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg" key={title}>
                  <p className="font-semibold text-zinc-950">{title}</p>
                  <p className="mt-1 text-sm text-zinc-500">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

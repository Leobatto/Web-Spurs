import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { PlayCircle, Film, Tv2 } from "lucide-react";

export const dynamic = "force-dynamic";

const channels = [
  { label: "TELEFONOS", href: "https://www.youtube.com/@MarySierras2025", icon: PlayCircle, tone: "text-zinc-950" },
  { label: "CIROMAR", href: "https://www.youtube.com/@marysierras.nautilusclub", icon: Film, tone: "text-zinc-700" },
  { label: "SMATA", href: "https://www.youtube.com/@SMATA.mar.y.sierras", icon: Tv2, tone: "text-zinc-500" },
] as const;

export default async function PartidosEnVivoPage() {
  await requireAppUser();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">En vivo</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Partidos en vivo</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Acceso rápido a los canales que suelen transmitir la jornada.</p>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          {channels.map(({ label, href, icon: Icon, tone }) => (
            <a
              className="group rounded-3xl border border-zinc-200 bg-zinc-50 p-5 transition hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-lg"
              href={href}
              key={label}
              rel="noreferrer noopener"
              target="_blank"
            >
              <div className={`inline-flex rounded-2xl border border-zinc-200 bg-white p-3 ${tone}`}>
                <Icon size={22} />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Canal</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-950">{label}</h2>
              <p className="mt-2 text-sm text-zinc-600">Abrir transmisión en YouTube.</p>
            </a>
          ))}
        </div>
        <Link className="mt-6 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800" href="/">
          Volver a la home
        </Link>
      </section>
    </div>
  );
}

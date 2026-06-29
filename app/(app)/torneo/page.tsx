import { requireAppUser } from "@/lib/auth";
import { TorneosSelector } from "@/components/torneos-selector";

export const dynamic = "force-dynamic";

const tournaments = [
  {
    key: "+40",
    label: "Maxi",
    level: "Torneo +40",
    url: "https://challenge.place/c/69bee60cfa30c03fe9ff4edb",
  },
  {
    key: "+30",
    label: "Pre maxi",
    level: "Torneo +30",
    url: "https://challenge.place/c/69bedbc0b171f2b1214480be",
  },
] as const;

export default async function TorneoPage() {
  await requireAppUser();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Torneos</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">La pizarra de torneos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Elegí +30 o +40 desde el selector, abrilo embebido y salí por el enlace directo si el navegador se pone terco.
        </p>
      </section>

      <TorneosSelector tournaments={tournaments} />
    </div>
  );
}

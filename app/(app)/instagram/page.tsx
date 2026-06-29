import { requireAppUser } from "@/lib/auth";
import { Camera, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

const instagramUrl = "https://www.instagram.com/jp.spurs/";
const instagramEmbedUrl = "https://www.instagram.com/jp.spurs/embed/";

export default async function InstagramPage() {
  await requireAppUser();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Instagram</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">La cancha también se ve acá</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Instagram no permite embebido directo en este navegador, así que lo dejamos como acceso limpio al perfil oficial.</p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-6 border-b border-zinc-100 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              <Camera size={14} /> JP Spurs
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight">Instagram embebido</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">Intentamos abrir el perfil dentro de un iframe. Si Instagram lo bloquea en tu navegador, usá el acceso directo.</p>
          </div>
          <a className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800" href={instagramUrl} rel="noreferrer noopener" target="_blank">
            <ExternalLink size={16} /> Abrir en Instagram
          </a>
        </div>
        <div className="bg-zinc-50">
          <iframe
            className="h-[80vh] w-full border-0 bg-white"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={instagramEmbedUrl}
            title="Instagram de JP Spurs"
          />
        </div>
        <p className="border-t border-zinc-100 px-6 py-4 text-sm text-zinc-500">
          Si el embed no carga por restricción de Instagram, abrilo directo con el botón de arriba.
        </p>
      </section>
    </div>
  );
}

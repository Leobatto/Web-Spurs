import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const instagramUrl = "https://www.instagram.com/jp.spurs/";

export default async function InstagramPage() {
  await requireAppUser();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Instagram</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">La cancha también se ve acá</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Feed embebido de JP Spurs para abrir fotos y movimiento del club sin salir del panel.</p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">JP Spurs</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Instagram</h2>
          <a className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800" href={instagramUrl} rel="noreferrer noopener" target="_blank">
            Abrir en Instagram
          </a>
        </div>
        <iframe
          className="h-[80vh] w-full border-0 bg-white"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={instagramUrl}
          title="Instagram de JP Spurs"
        />
      </section>
    </div>
  );
}

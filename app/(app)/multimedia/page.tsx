import { requireAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const photosUrl = "https://photos.google.com/share/AF1QipN3qBIhUMEbEk9iz6S2tqkq6Jmh3GnCg87G9ROfWWJ-qeEuOxwzhI54I1VvIL4jVg?key=a3BDc1g4Nnl3UGp5anhwRmh2WS1sMDg1LU56aVNB";

export default async function MultimediaPage() {
  await requireAppUser();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-zinc-900 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_80px_rgba(9,9,11,0.34)] sm:px-8 sm:py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400">Multimedia</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Archivo visual del club</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
          Fotos, videos y material de JP Spurs en un solo lugar, listo para abrir desde el panel.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Banco multimedia</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Fotos, clips y archivo</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">La galería queda embebida para que el equipo la vea sin salir de JP Spurs.</p>
          <a className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800" href={photosUrl} rel="noreferrer noopener" target="_blank">
            Abrir galería
          </a>
        </div>
        <iframe
          className="h-[78vh] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={photosUrl}
          title="Galería multimedia de JP Spurs"
        />
      </section>
    </div>
  );
}

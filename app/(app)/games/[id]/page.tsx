import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { games } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [game] = await db.select().from(games).where(eq(games.id, id)).limit(1);

  if (!game) {
    notFound();
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Partido</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Spurs vs {game.opponent}</h1>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-zinc-600">{game.finalScore ?? "Resultado pendiente"}</p>
        {game.youtubeUrl ? (
          <a className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" href={game.youtubeUrl} target="_blank">
            Ver video en YouTube
          </a>
        ) : null}
      </div>
    </div>
  );
}

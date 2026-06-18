import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Partido</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Box score</h1>
      <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-zinc-600">Partido: {id}</p>
      </div>
    </div>
  );
}

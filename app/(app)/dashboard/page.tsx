import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { games, players } from "@/db/schema";
import { StatCard } from "@/components/stat-card";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAdmin();
  const [[playerCount], [gameCount]] = await Promise.all([
    db.select({ value: count() }).from(players).where(eq(players.ownerUserId, user.id)),
    db.select({ value: count() }).from(games).where(eq(games.ownerUserId, user.id)),
  ]);

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Dashboard</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard label="Jugadores" value={playerCount.value} helper="Fichas del plantel" />
        <StatCard label="Partidos" value={gameCount.value} helper="PM y M" />
        <StatCard label="Emails" value="Resend" helper="Pendiente de API key" />
      </div>
    </div>
  );
}

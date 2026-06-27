import { gamePhases } from "@/lib/game-phases";

export function GameFilters({
  opponents,
  selectedOpponent,
  selectedPhase,
}: {
  opponents: string[];
  selectedOpponent?: string;
  selectedPhase?: string;
}) {
  return (
    <form className="mt-6 grid gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]" method="get">
      <label className="block text-sm font-medium text-zinc-700">
        Rival
        <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue={selectedOpponent ?? ""} name="opponent">
          <option value="">Todos los rivales</option>
          {opponents.map((opponent) => (
            <option key={opponent} value={opponent}>
              {opponent}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Fase
        <select className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue={selectedPhase ?? ""} name="phase">
          <option value="">Todas las fases</option>
          {gamePhases.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
        </select>
      </label>
      <button className="self-end rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2" type="submit">
        Aplicar
      </button>
    </form>
  );
}

import { gamePhases } from "@/lib/game-phases";
import { gameCategoryOptions } from "@/lib/game-categories";

export function GameFilters({
  opponents,
  selectedOpponent,
  selectedPhase,
  selectedCategory,
}: {
  opponents: string[];
  selectedOpponent?: string;
  selectedPhase?: string;
  selectedCategory?: string;
}) {
  const hasCategoryFilter = selectedCategory !== undefined;

  return (
    <form className={`mt-6 grid gap-3 rounded-[28px] border border-zinc-800 bg-zinc-950 p-4 text-white shadow-[0_20px_60px_rgba(9,9,11,0.28)] ${hasCategoryFilter ? "md:grid-cols-[1fr_1fr_1fr_auto]" : "md:grid-cols-[1fr_1fr_auto]"}`} method="get">
      <label className="block text-sm font-medium text-zinc-200">
        Rival
        <select className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40" defaultValue={selectedOpponent ?? ""} name="opponent">
          <option value="">Todos los rivales</option>
          {opponents.map((opponent) => (
            <option key={opponent} value={opponent}>
              {opponent}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-200">
        Fase
        <select className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40" defaultValue={selectedPhase ?? ""} name="phase">
          <option value="">Todas las fases</option>
          {gamePhases.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
          </select>
        </label>
      {hasCategoryFilter ? (
        <label className="block text-sm font-medium text-zinc-200">
          Categoría
          <select className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40" defaultValue={selectedCategory} name="category">
            <option value="total">Todo</option>
            {gameCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button className="self-end rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950" type="submit">
        Aplicar
      </button>
    </form>
  );
}

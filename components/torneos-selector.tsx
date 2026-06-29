"use client";

import { useMemo, useState } from "react";

type TournamentOption = {
  key: string;
  label: string;
  level: string;
  url: string;
};

export function TorneosSelector({ tournaments }: { tournaments: readonly TournamentOption[] }) {
  const [selectedKey, setSelectedKey] = useState(tournaments[0]?.key ?? "");

  const currentTournament = useMemo(
    () => tournaments.find((tournament) => tournament.key === selectedKey) ?? tournaments[0],
    [selectedKey, tournaments],
  );

  if (!currentTournament) {
    return null;
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm font-medium text-zinc-700">
        Elegí la categoría
        <select
          className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
          onChange={(event) => setSelectedKey(event.target.value)}
          value={currentTournament.key}
        >
          {tournaments.map((tournament) => (
            <option key={tournament.key} value={tournament.key}>
              {tournament.label} · {tournament.level}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">{currentTournament.level}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{currentTournament.label}</h2>
          <p className="mt-2 text-sm text-zinc-600">Vista embebida con acceso rápido al challenge oficial.</p>
          <a className="mt-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800" href={currentTournament.url} rel="noreferrer noopener" target="_blank">
            Abrir en challenge.place
          </a>
        </div>
        <iframe
          className="h-[78vh] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={currentTournament.url}
          title={currentTournament.label}
        />
      </div>
    </div>
  );
}

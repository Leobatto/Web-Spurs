"use client";

import Link from "next/link";
import { useState } from "react";
import {
  bulkUnifyPlayers,
  deletePlayer,
  updatePlayer,
} from "@/app/actions/roster";

type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

export function RosterManager({ roster }: { roster: RosterPlayer[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const firstSelected = roster.find((player) => player.id === selectedIds[0]);

  function togglePlayer(playerId: string) {
    setSelectedIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-zinc-500">
          {selectedIds.length} jugador(es) seleccionados para unificar
        </p>
        <button
          className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          disabled={selectedIds.length < 2}
          onClick={() => setModalOpen(true)}
          type="button"
        >
          Unificar seleccionados
        </button>
      </div>
      {roster.length === 0 ? (
        <p className="p-6 text-zinc-500">Todavía no hay jugadores cargados.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3">Sel.</th>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Nro.</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => (
              <tr className="border-t border-zinc-100" key={player.id}>
                <td className="px-5 py-4 align-top">
                  <input
                    checked={selectedIds.includes(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-5 py-4 align-top">
                  <form action={updatePlayer} className="grid gap-2 sm:grid-cols-[1fr_92px_auto]">
                    <input name="playerId" type="hidden" value={player.id} />
                    <input
                      className="rounded-xl border border-zinc-200 px-3 py-2 font-medium"
                      defaultValue={player.name}
                      name="name"
                      required
                    />
                    <input
                      className="rounded-xl border border-zinc-200 px-3 py-2"
                      defaultValue={player.jerseyNumber ?? ""}
                      name="jerseyNumber"
                      type="number"
                      min="0"
                      max="99"
                    />
                    <button className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold" type="submit">
                      Guardar
                    </button>
                  </form>
                </td>
                <td className="px-5 py-4 align-top text-zinc-500">{player.jerseyNumber ?? "-"}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white" href={`/players/${player.id}`}>
                      Estadísticas
                    </Link>
                    <form action={deletePlayer}>
                      <input name="playerId" type="hidden" value={player.id} />
                      <button className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(560px,calc(100%-2rem))] rounded-3xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/40">
          <form action={bulkUnifyPlayers} className="p-6">
            <input name="selectedPlayerIds" type="hidden" value={selectedIds.join(",")} />
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Unificar jugadores</p>
            <h2 className="mt-2 text-2xl font-black">¿Cómo debe quedar la ficha?</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Se conservará la primera ficha seleccionada como destino y se moverán ahí las estadísticas de las demás.
            </p>
            <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
              {selectedIds.map((id, index) => {
                const player = roster.find((item) => item.id === id);
                return player ? <p key={id}>{index === 0 ? "Destino" : "Origen"}: {player.name}</p> : null;
              })}
            </div>
            <label className="mt-5 block text-sm font-medium text-zinc-700">
              Nombre final
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={firstSelected?.name ?? ""}
                name="finalName"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Número final
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={firstSelected?.jerseyNumber ?? ""}
                name="jerseyNumber"
                type="number"
                min="0"
                max="99"
              />
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
                Confirmar unificación
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </div>
  );
}

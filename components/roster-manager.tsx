"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  bulkUnifyPlayers,
  deletePlayer,
  updatePlayer,
} from "@/app/actions/roster";
import { formatPlayerDisplayName } from "@/lib/player-name";

type RosterPlayer = {
  id: string;
  name: string;
  lastName: string | null;
  nickname: string | null;
  photoUrl: string | null;
  jerseyNumber: number | null;
};

function nextSort(currentSort: string, column: "name" | "lastName" | "jersey") {
  return currentSort === `${column}-asc` ? `${column}-desc` : `${column}-asc`;
}

function sortArrow(currentSort: string, column: "name" | "lastName" | "jersey") {
  if (currentSort === `${column}-asc`) return " ↑";
  if (currentSort === `${column}-desc`) return " ↓";
  return "";
}

export function RosterManager({
  activeSort,
  roster,
}: {
  activeSort: string;
  roster: RosterPlayer[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [unifyModalOpen, setUnifyModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const firstSelected = roster.find((player) => player.id === selectedIds[0]);
  const unificationSuggestions = Array.from(
    roster
      .filter((player) => player.jerseyNumber !== null)
      .reduce((groups, player) => {
        const jerseyNumber = player.jerseyNumber as number;
        const current = groups.get(jerseyNumber) ?? [];

        groups.set(jerseyNumber, [...current, player]);

        return groups;
      }, new Map<number, RosterPlayer[]>())
      .entries(),
  )
    .map(([jerseyNumber, playersWithSameNumber]) => ({
      jerseyNumber,
      players: playersWithSameNumber,
    }))
    .filter((suggestion) => suggestion.players.length > 1)
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  function togglePlayer(playerId: string) {
    setSelectedIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  function selectSuggestion(playersWithSameNumber: RosterPlayer[]) {
    setSelectedIds(playersWithSameNumber.map((player) => player.id));
  }

  function openSuggestion(playersWithSameNumber: RosterPlayer[]) {
    selectSuggestion(playersWithSameNumber);
    setUnifyModalOpen(true);
  }

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            {selectedIds.length} jugador(es) seleccionados
          </p>
          <p className="mt-1 text-xs text-zinc-400">Hacé click en Nombre, Apellido o Nro. para ordenar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            disabled={selectedIds.length !== 1}
            onClick={() => setEditModalOpen(true)}
            type="button"
          >
            Editar seleccionado
          </button>
          <button
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={selectedIds.length < 2}
            onClick={() => setUnifyModalOpen(true)}
            type="button"
          >
            Unificar seleccionados
          </button>
        </div>
      </div>
      {unificationSuggestions.length > 0 ? (
        <div className="border-b border-zinc-100 bg-amber-50/60 p-4">
          <p className="text-sm font-bold text-amber-950">Sugerencias por número de camiseta</p>
          <div className="mt-3 grid gap-3">
            {unificationSuggestions.map((suggestion) => (
              <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={suggestion.jerseyNumber}>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">#{suggestion.jerseyNumber}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {suggestion.players.map((player) => formatPlayerDisplayName(player)).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-900"
                    onClick={() => selectSuggestion(suggestion.players)}
                    type="button"
                  >
                    Seleccionar
                  </button>
                  <button
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950"
                    onClick={() => openSuggestion(suggestion.players)}
                    type="button"
                  >
                    Unificar este número
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {roster.length === 0 ? (
        <p className="p-6 text-zinc-500">Todavía no hay jugadores cargados.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3">Sel.</th>
              <th className="px-5 py-3">
                <Link className="inline-flex items-center font-semibold hover:text-zinc-950" href={`/roster?sort=${nextSort(activeSort, "name")}`}>
                  Nombre{sortArrow(activeSort, "name")}
                </Link>
              </th>
              <th className="px-5 py-3">
                <Link className="inline-flex items-center font-semibold hover:text-zinc-950" href={`/roster?sort=${nextSort(activeSort, "lastName")}`}>
                  Apellido{sortArrow(activeSort, "lastName")}
                </Link>
              </th>
              <th className="px-5 py-3">
                <Link className="inline-flex items-center font-semibold hover:text-zinc-950" href={`/roster?sort=${nextSort(activeSort, "jersey")}`}>
                  Nro.{sortArrow(activeSort, "jersey")}
                </Link>
              </th>
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
                <td className="px-5 py-4 align-top font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                      {player.photoUrl ? (
                        <Image alt={formatPlayerDisplayName(player)} className="h-full w-full object-cover" height={44} src={player.photoUrl} width={44} />
                      ) : null}
                    </div>
                    <span>{formatPlayerDisplayName(player)}</span>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-zinc-500">{player.lastName ?? "-"}</td>
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

      {editModalOpen && firstSelected ? (
        <dialog open className="fixed inset-0 z-50 m-auto w-[min(560px,calc(100%-2rem))] rounded-3xl border border-zinc-200 bg-white p-0 shadow-2xl backdrop:bg-black/40">
          <form action={updatePlayer} className="p-6">
            <input name="playerId" type="hidden" value={firstSelected.id} />
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Editar jugador</p>
            <h2 className="mt-2 text-2xl font-black">{formatPlayerDisplayName(firstSelected)}</h2>
            <label className="mt-5 block text-sm font-medium text-zinc-700">
              Nombre
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={firstSelected.name} name="name" required />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Apellido
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={firstSelected.lastName ?? ""} name="lastName" />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Apodo
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={firstSelected.nickname ?? ""} name="nickname" />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Número
              <input className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3" defaultValue={firstSelected.jerseyNumber ?? ""} name="jerseyNumber" type="number" min="0" max="99" />
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold" onClick={() => setEditModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </dialog>
      ) : null}

      {unifyModalOpen ? (
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
                return player ? <p key={id}>{index === 0 ? "Destino" : "Origen"}: {formatPlayerDisplayName(player)}</p> : null;
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
              Apellido final
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={firstSelected?.lastName ?? ""}
                name="finalLastName"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-700">
              Apodo final
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3"
                defaultValue={firstSelected?.nickname ?? ""}
                name="finalNickname"
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
              <button className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold" onClick={() => setUnifyModalOpen(false)} type="button">
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

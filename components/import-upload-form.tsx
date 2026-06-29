"use client";

import { useEffect, useMemo, useState } from "react";
import { registerImport } from "@/app/actions/import";

type TournamentOption = {
  id: string;
  name: string;
};

type PhaseOption = {
  value: string;
  label: string;
};

type PrecheckResult = {
  duplicates: Array<{ fileName: string; importId: string; status: string }>;
};

export function ImportUploadForm({
  tournamentOptions,
  defaultTournamentId,
  phaseOptions,
}: {
  tournamentOptions: readonly TournamentOption[];
  defaultTournamentId: string;
  phaseOptions: readonly PhaseOption[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [checking, setChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<PrecheckResult["duplicates"]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedNames = useMemo(() => files.map((file) => file.name), [files]);

  useEffect(() => {
    let active = true;

    async function precheck() {
      if (selectedNames.length === 0) {
        setDuplicates([]);
        setError(null);
        return;
      }

      setChecking(true);
      setError(null);

      try {
        const response = await fetch("/api/import/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileNames: selectedNames }),
        });

        if (!response.ok) {
          throw new Error("No se pudo validar el archivo antes de subirlo.");
        }

        const data = (await response.json()) as PrecheckResult;

        if (active) {
          setDuplicates(data.duplicates ?? []);
        }
      } catch (precheckError) {
        if (active) {
          setError(precheckError instanceof Error ? precheckError.message : "No se pudo validar el archivo antes de subirlo.");
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    void precheck();

    return () => {
      active = false;
    };
  }, [selectedNames]);

  return (
    <form action={registerImport} className="h-fit rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Paso 1</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Subí los PDFs</h2>
        </div>
        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">Precheck activo</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Elegí uno o más archivos. Antes de enviar, comprobamos si alguno ya está cargado para evitar duplicados.
      </p>

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        Torneo
        <select className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue={defaultTournamentId} name="tournamentId" required>
          <option value="">Seleccionar torneo</option>
          {tournamentOptions.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        Fase
        <select className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20" defaultValue="regular" name="phase" required>
          {phaseOptions.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        PDFs
        <input
          accept="application/pdf"
          className="mt-2 w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          multiple
          name="pdfs"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          type="file"
          required
        />
      </label>

      <label className="mt-5 block text-sm font-medium text-zinc-700">
        YouTube (opcional)
        <input
          className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
          name="youtubeUrl"
          placeholder="https://www.youtube.com/watch?v=..."
          type="url"
        />
      </label>

      <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
        {checking ? (
          <p>Validando si los PDFs ya existen...</p>
        ) : duplicates.length > 0 ? (
          <div className="space-y-2">
            <p className="font-semibold text-amber-800">Hay archivos ya cargados. Quitalos o renombralos antes de continuar.</p>
            <ul className="list-disc space-y-1 pl-5 text-amber-900">
              {duplicates.map((duplicate) => (
                <li key={`${duplicate.importId}-${duplicate.fileName}`}>
                  {duplicate.fileName} ({duplicate.status})
                </li>
              ))}
            </ul>
          </div>
        ) : files.length > 0 ? (
          <div>
            <p className="font-semibold text-emerald-800">Listo para subir</p>
            <p className="mt-1">{files.length} archivo(s) seleccionados sin duplicados detectados.</p>
          </div>
        ) : (
          <p>Seleccioná uno o más PDFs para chequearlos antes de subir.</p>
        )}
        {error ? <p className="mt-2 text-red-700">{error}</p> : null}
      </div>

      <button
        className="mt-5 w-full rounded-2xl bg-zinc-950 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={checking || duplicates.length > 0}
        type="submit"
      >
        {checking ? "Chequeando..." : duplicates.length > 0 ? "Revisar duplicados" : "Registrar importación"}
      </button>
    </form>
  );
}

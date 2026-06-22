"use client";

import { useMemo, useState } from "react";

export type PlayItem = {
  title: string;
  url: string;
};

export type PlaySection = {
  title: string;
  items: PlayItem[];
};

export function JugadasBrowser({ sections }: { sections: PlaySection[] }) {
  const initialItem = sections[0]?.items[0] ?? null;
  const [selectedUrl, setSelectedUrl] = useState(initialItem?.url ?? "");
  const [selectedTitle, setSelectedTitle] = useState(initialItem?.title ?? "");

  const selectedItem = useMemo(
    () => sections.flatMap((section) => section.items).find((item) => item.url === selectedUrl) ?? initialItem,
    [initialItem, sections, selectedUrl],
  );

  function selectItem(item: PlayItem) {
    setSelectedUrl(item.url);
    setSelectedTitle(item.title);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-5">
        {sections.map((section) => (
          <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm" key={section.title}>
            <h2 className="text-lg font-black tracking-tight">{section.title}</h2>
            <div className="mt-3 grid gap-2">
              {section.items.map((item) => {
                const active = item.url === selectedUrl;

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400"}`}
                    key={item.url}
                    onClick={() => selectItem(item)}
                    type="button"
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Pizarra</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{selectedTitle || "Seleccioná una jugada"}</h1>
        </div>
        <div className="bg-zinc-950">
          {selectedItem ? (
            <iframe
              className="h-[78vh] w-full"
              src={selectedItem.url}
              title={selectedItem.title}
            />
          ) : (
            <div className="flex h-[78vh] items-center justify-center p-10 text-center text-zinc-300">
              No hay jugadas cargadas.
            </div>
          )}
        </div>
        {selectedItem ? (
          <div className="border-t border-zinc-100 p-5">
            <a
              className="text-sm font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
              href={selectedItem.url}
              rel="noreferrer"
              target="_blank"
            >
              Abrir en nueva pestaña
            </a>
          </div>
        ) : null}
      </section>
    </div>
  );
}

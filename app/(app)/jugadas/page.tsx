import { JugadasBrowser, type PlaySection } from "@/components/jugadas-browser";

export const dynamic = "force-dynamic";

const sections: PlaySection[] = [
  {
    title: "Jugadas Spurs",
    items: [{ title: "Simbología de la pizarra", url: "https://www.instagram.com/reel/DTbI493iK6T/?igsh=bWUyNG91cDEydWdt" }],
  },
  {
    title: "Contra hombre",
    items: [
      { title: "Cuerno", url: "https://www.instagram.com/reel/DUfnrZSDhU7/?igsh=MXBzaXRlaGl4eWZ0ZA==" },
      { title: "Variante vieja", url: "https://thehoopsgeek.com/play/fGHLo3bnvo" },
      { title: "Variante nueva", url: "https://thehoopsgeek.com/play/UUndKUfHHy" },
      { title: "Flow", url: "https://thehoopsgeek.com/play/yxqzcl5aSw" },
      { title: "Libre", url: "https://www.instagram.com/reel/DXNzLDXjUeb/?igsh=MTB0ejh1YWt4M3drdw==" },
    ],
  },
  {
    title: "Contra zona 2-3",
    items: [
      { title: "👎🏽", url: "https://thehoopsgeek.com/play/Ggh16eY6iB" },
      { title: "👍🏽", url: "https://thehoopsgeek.com/play/QUBVLV6UcH" },
    ],
  },
  {
    title: "Salida de fondo",
    items: [{ title: "Elevador", url: "https://www.instagram.com/reel/DVd7yasDsEa/?igsh=MTNzaWl6M2ZqbzYxZg==" }],
  },
  {
    title: "Salida lateral",
    items: [{ title: "Lateral", url: "https://thehoopsgeek.com/play/WR94ntBngz" }],
  },
];

export default function JugadasPage() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Pizarra</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Jugadas</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">
        Repaso de sistemas y variantes. Tocá una jugada para abrirla dentro del sitio.
      </p>
      <JugadasBrowser sections={sections} />
    </div>
  );
}

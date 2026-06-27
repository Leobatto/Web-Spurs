export const gamePhases = [
  { value: "regular", label: "Fase Regular" },
  { value: "quarterfinal", label: "Cuartos de final" },
  { value: "semifinal", label: "Semifinal" },
  { value: "final", label: "Final" },
] as const;

export type GamePhase = (typeof gamePhases)[number]["value"];

export function formatGamePhase(phase: string) {
  return gamePhases.find((item) => item.value === phase)?.label ?? phase;
}

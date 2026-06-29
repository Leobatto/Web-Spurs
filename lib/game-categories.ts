export const gameCategoryOptions = [
  { value: "PM", label: "+30" },
  { value: "M", label: "+40" },
  { value: "U", label: "Torneo de Verano 26" },
] as const;

export const gameCategoryValues = ["PM", "M", "U"] as const;

export type GameCategoryValue = (typeof gameCategoryOptions)[number]["value"];

export function formatGameCategory(category: string) {
  return gameCategoryOptions.find((item) => item.value === category)?.label ?? category;
}

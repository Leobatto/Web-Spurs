export function deriveLastName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  if (normalized.includes(",")) {
    return normalized.split(",")[0]?.trim() ?? "";
  }

  const withoutNumber = normalized.replace(/^#?\d+\s+/, "");
  const parts = withoutNumber.split(" ").filter(Boolean);

  if (parts.length > 1 && /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]\.?$/.test(parts.at(-1) ?? "")) {
    return parts[0].replace(/[.,]+$/g, "");
  }

  return parts.at(-1) ?? withoutNumber;
}

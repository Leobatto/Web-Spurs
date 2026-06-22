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

export type PlayerNameParts = {
  name: string;
  lastName?: string | null;
  nickname?: string | null;
};

function cleanPart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function lastWord(value: string) {
  return value.split(" ").filter(Boolean).at(-1) ?? "";
}

export function formatPlayerDisplayName(player: PlayerNameParts) {
  const name = cleanPart(player.name);
  const lastName = cleanPart(player.lastName);
  const nickname = cleanPart(player.nickname);

  if (!name) {
    return nickname || lastName;
  }

  if (!nickname && !lastName) {
    return name;
  }

  const nameEndsWithLastName = Boolean(lastName) && lastWord(name).toLowerCase() === lastName.toLowerCase();

  if (nickname) {
    if (nameEndsWithLastName) {
      const base = name.slice(0, Math.max(0, name.length - lastName.length)).trimEnd();
      return `${base} "${nickname}" ${lastName}`.trim().replace(/\s+/g, " ");
    }

    return [name, `"${nickname}"`, lastName].filter(Boolean).join(" ");
  }

  if (nameEndsWithLastName) {
    return name;
  }

  return [name, lastName].filter(Boolean).join(" ");
}

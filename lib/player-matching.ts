import type { InferSelectModel } from "drizzle-orm";
import type { players } from "@/db/schema";

type Player = InferSelectModel<typeof players>;

export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) => [row]);

  for (let column = 1; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
  }

  return matrix[a.length][b.length];
}

function confidence(raw: string, candidate: string) {
  const normalizedRaw = normalizeName(raw);
  const normalizedCandidate = normalizeName(candidate);

  if (!normalizedRaw || !normalizedCandidate) {
    return 0;
  }

  if (normalizedRaw === normalizedCandidate) {
    return 100;
  }

  const maxLength = Math.max(normalizedRaw.length, normalizedCandidate.length);
  const score = Math.round((1 - distance(normalizedRaw, normalizedCandidate) / maxLength) * 100);

  if (normalizedCandidate.includes(normalizedRaw) || normalizedRaw.includes(normalizedCandidate)) {
    return Math.max(score, 86);
  }

  return Math.max(0, score);
}

export function findBestPlayerMatch(rawName: string, roster: Player[]) {
  const matches = roster
    .map((player) => ({
      player,
      confidence: confidence(rawName, player.name),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return matches[0] ?? null;
}

export function findLearnedPlayerMatch(
  rawName: string,
  learnedMatches: { rawName: string; playerId: string | null }[],
  roster: Player[],
) {
  const normalizedRawName = normalizeName(rawName);
  for (const learnedMatch of learnedMatches) {
    if (normalizeName(learnedMatch.rawName) !== normalizedRawName) {
      continue;
    }

    const player = roster.find((item) => item.id === learnedMatch.playerId);

    if (player) {
      return { player, confidence: 100 };
    }
  }

  return null;
}

export function needsAdminReview(confidenceValue: number) {
  return confidenceValue >= 72 && confidenceValue < 92;
}

export function isConfidentMatch(confidenceValue: number) {
  return confidenceValue >= 92;
}

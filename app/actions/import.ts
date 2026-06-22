"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  games,
  imports,
  playerGameStats,
  playerMatchReviews,
  players,
} from "@/db/schema";
import { analyzeGamePdf } from "@/lib/import-analysis";
import { requireAdmin } from "@/lib/auth";
import { syncGameToGoogleCalendar } from "@/lib/google-calendar";
import { createId } from "@/lib/ids";
import { deriveLastName } from "@/lib/player-name";
import { getOrCreateDefaultTournaments } from "@/lib/tournaments";
import {
  findBestPlayerMatch,
  findLearnedPlayerMatch,
  isConfidentMatch,
  needsAdminReview,
} from "@/lib/player-matching";

const youtubeUrlSchema = z.string().trim().refine((value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.hostname === "youtu.be" || url.hostname.endsWith("youtube.com");
  } catch {
    return false;
  }
}, "Ingresá una URL válida de YouTube.");

function getUploadedFileName(value: FormDataEntryValue | null) {
  if (value && typeof value === "object" && "name" in value) {
    return String(value.name);
  }

  return "";
}

function asUploadFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null;
}

async function processImportFile(input: {
  userId: string;
  tournamentId: string;
  file: File;
  youtubeUrl: string;
}) {
  const fileName = getUploadedFileName(input.file);

  if (!fileName) {
    return { status: "failed" as const };
  }

  const [existingImport] = await db
    .select({ id: imports.id, status: imports.status })
    .from(imports)
    .where(
      and(
        eq(imports.ownerUserId, input.userId),
        eq(imports.fileName, fileName),
      ),
    )
    .limit(1);

  let importId = createId("import");

  if (existingImport && existingImport.status !== "failed") {
    return { status: "duplicate" as const };
  }

  if (existingImport?.status === "failed") {
    importId = existingImport.id;
    await db
      .update(imports)
      .set({
        tournamentId: input.tournamentId,
        status: "analyzing",
        rawExtraction: null,
        analysisSummary: null,
        unresolvedMatches: 0,
        error: null,
        gameId: null,
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));
  } else {
    await db.insert(imports).values({
      id: importId,
      ownerUserId: input.userId,
      tournamentId: input.tournamentId,
      fileName,
      status: "analyzing",
    });
  }

  try {
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const analysis = await analyzeGamePdf({
      fileName,
      contentType: input.file.type || "application/pdf",
      base64: buffer.toString("base64"),
    });

    const roster = await db
      .select()
      .from(players)
      .where(eq(players.ownerUserId, input.userId));
    const learnedMatches = await db
      .select({
        rawName: playerMatchReviews.rawName,
        suggestedPlayerId: playerMatchReviews.suggestedPlayerId,
        createdPlayerId: playerMatchReviews.createdPlayerId,
      })
      .from(playerMatchReviews)
      .where(
        and(
          eq(playerMatchReviews.ownerUserId, input.userId),
          inArray(playerMatchReviews.status, ["resolved", "created"]),
        ),
      )
      .orderBy(desc(playerMatchReviews.updatedAt));
    const learnedPlayerMatches = learnedMatches.map((match) => ({
      rawName: match.rawName,
      playerId: match.createdPlayerId ?? match.suggestedPlayerId,
    }));
    const gameId = createId("game");
    let unresolvedMatches = 0;

    const game = {
      id: gameId,
      ownerUserId: input.userId,
      tournamentId: input.tournamentId,
      category: analysis.category,
      opponent: analysis.opponent,
      date: analysis.date ? new Date(analysis.date) : new Date(),
      isHome: analysis.isHome,
      finalScore: `Spurs ${analysis.finalScore.spurs} - ${analysis.opponent} ${analysis.finalScore.rival}`,
      q1Spurs: analysis.quarters[0].spurs,
      q1Rival: analysis.quarters[0].rival,
      q2Spurs: analysis.quarters[1].spurs,
      q2Rival: analysis.quarters[1].rival,
      q3Spurs: analysis.quarters[2].spurs,
      q3Rival: analysis.quarters[2].rival,
      q4Spurs: analysis.quarters[3].spurs,
      q4Rival: analysis.quarters[3].rival,
      summaryWhatsapp: analysis.whatsappSummary,
      validationNotes: analysis.validation.notes,
      youtubeUrl: input.youtubeUrl || null,
      googleCalendarEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies typeof games.$inferInsert;

    await db.insert(games).values(game);

    for (const playerStats of analysis.players) {
      const learnedMatch = findLearnedPlayerMatch(
        playerStats.name,
        learnedPlayerMatches,
        roster,
      );
      const bestMatch = learnedMatch ?? findBestPlayerMatch(playerStats.name, roster);
      let playerId: string | null = null;

      if (bestMatch && isConfidentMatch(bestMatch.confidence)) {
        playerId = bestMatch.player.id;
      } else if (bestMatch && needsAdminReview(bestMatch.confidence)) {
        unresolvedMatches += 1;
        await db.insert(playerMatchReviews).values({
          id: createId("match"),
          importId,
          ownerUserId: input.userId,
          rawName: playerStats.name,
          rawStats: playerStats,
          suggestedPlayerId: bestMatch.player.id,
          suggestedPlayerName: bestMatch.player.name,
          confidence: bestMatch.confidence,
          status: "pending",
        });
      } else {
        playerId = createId("player");
        await db.insert(players).values({
          id: playerId,
          ownerUserId: input.userId,
          name: playerStats.name,
          lastName: deriveLastName(playerStats.name),
          nickname: null,
          jerseyNumber: playerStats.jerseyNumber ?? null,
        });
        roster.push({
          id: playerId,
          ownerUserId: input.userId,
          name: playerStats.name,
          lastName: deriveLastName(playerStats.name),
          nickname: null,
          photoUrl: null,
          jerseyNumber: playerStats.jerseyNumber ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (!playerId) {
        continue;
      }

      await db.insert(playerGameStats).values({
        id: createId("stat"),
        gameId,
        playerId,
        minutes: playerStats.minutes,
        points: playerStats.points,
        fgMade: playerStats.fgMade,
        fgAtt: playerStats.fgAtt,
        twoMade: playerStats.twoMade,
        twoAtt: playerStats.twoAtt,
        threeMade: playerStats.threeMade,
        threeAtt: playerStats.threeAtt,
        ftMade: playerStats.ftMade,
        ftAtt: playerStats.ftAtt,
        offReb: playerStats.offReb,
        defReb: playerStats.defReb,
        assists: playerStats.assists,
        steals: playerStats.steals,
        blocks: playerStats.blocks,
        turnovers: playerStats.turnovers,
        fouls: playerStats.fouls,
        plusMinus: playerStats.plusMinus,
      });
    }

    await db
      .update(imports)
      .set({
        tournamentId: input.tournamentId,
        status: unresolvedMatches > 0 ? "reviewed" : "saved",
        rawExtraction: analysis,
        analysisSummary: analysis.whatsappSummary,
        unresolvedMatches,
        gameId,
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));

    try {
      await syncGameToGoogleCalendar(game as typeof games.$inferSelect);
    } catch {
      // Calendar sync must never block PDF stats from being saved.
    }

    return { status: unresolvedMatches > 0 ? ("reviewed" as const) : ("saved" as const) };
  } catch (error) {
    await db
      .update(imports)
      .set({
        tournamentId: input.tournamentId,
        status: "failed",
        error: error instanceof Error ? error.message : "Error desconocido al analizar PDF.",
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));

    return { status: "failed" as const };
  }
}

export async function registerImport(formData: FormData) {
  const user = await requireAdmin();
  const defaultTournaments = await getOrCreateDefaultTournaments(user.id);
  const tournamentId = String(formData.get("tournamentId") ?? defaultTournaments[0]?.id ?? "");
  const youtubeUrl = youtubeUrlSchema.parse(String(formData.get("youtubeUrl") ?? ""));
  const files = formData.getAll("pdfs").map(asUploadFile).filter((file): file is File => Boolean(file));
  const filesToProcess = files.length > 0 ? files : [asUploadFile(formData.get("pdf"))].filter((file): file is File => Boolean(file));

  let processed = 0;
  let duplicates = 0;
  let failed = 0;

  for (const file of filesToProcess) {
    const result = await processImportFile({
      userId: user.id,
      tournamentId,
      file,
      youtubeUrl,
    });

    if (result.status === "saved" || result.status === "reviewed") {
      processed += 1;
    } else if (result.status === "duplicate") {
      duplicates += 1;
    } else {
      failed += 1;
    }
  }

  revalidatePath("/import");
  revalidatePath("/roster");
  revalidatePath("/dashboard");
  redirect(`/import?message=imports-processed&processed=${processed}&duplicates=${duplicates}&failed=${failed}`);
}

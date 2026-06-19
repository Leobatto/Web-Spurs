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
import {
  findBestPlayerMatch,
  findLearnedPlayerMatch,
  isConfidentMatch,
  needsAdminReview,
} from "@/lib/player-matching";

const importSchema = z.object({
  fileName: z.string().trim().min(1),
});

function getUploadedFileName(value: FormDataEntryValue | null) {
  if (value && typeof value === "object" && "name" in value) {
    return String(value.name);
  }

  return "";
}

export async function registerImport(formData: FormData) {
  const user = await requireAdmin();
  const file = formData.get("pdf");
  const fileName = getUploadedFileName(file);
  const parsed = importSchema.parse({ fileName });
  let importId = createId("import");

  const [existingImport] = await db
    .select({ id: imports.id, status: imports.status })
    .from(imports)
    .where(
      and(
        eq(imports.ownerUserId, user.id),
        eq(imports.fileName, parsed.fileName),
      ),
    )
    .limit(1);

  if (existingImport && existingImport.status !== "failed") {
    redirect(`/import?error=duplicate&file=${encodeURIComponent(parsed.fileName)}`);
  }

  if (existingImport?.status === "failed") {
    importId = existingImport.id;
    await db
      .update(imports)
      .set({
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
      ownerUserId: user.id,
      fileName: parsed.fileName,
      status: "analyzing",
    });
  }

  try {
    if (!file || typeof file === "string") {
      throw new Error("No se recibio un archivo PDF valido.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await analyzeGamePdf({
      fileName: parsed.fileName,
      contentType: file.type || "application/pdf",
      base64: buffer.toString("base64"),
    });

    const roster = await db
      .select()
      .from(players)
      .where(eq(players.ownerUserId, user.id));
    const learnedMatches = await db
      .select({
        rawName: playerMatchReviews.rawName,
        suggestedPlayerId: playerMatchReviews.suggestedPlayerId,
        createdPlayerId: playerMatchReviews.createdPlayerId,
      })
      .from(playerMatchReviews)
      .where(
        and(
          eq(playerMatchReviews.ownerUserId, user.id),
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
      ownerUserId: user.id,
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
      googleCalendarEventId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies typeof games.$inferInsert;

    await db.insert(games).values(game);
    await syncGameToGoogleCalendar(game as typeof games.$inferSelect);

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
          ownerUserId: user.id,
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
          ownerUserId: user.id,
          name: playerStats.name,
          lastName: deriveLastName(playerStats.name),
          jerseyNumber: playerStats.jerseyNumber ?? null,
        });
        roster.push({
          id: playerId,
          ownerUserId: user.id,
          name: playerStats.name,
          lastName: deriveLastName(playerStats.name),
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
        status: unresolvedMatches > 0 ? "reviewed" : "saved",
        rawExtraction: analysis,
        analysisSummary: analysis.whatsappSummary,
        unresolvedMatches,
        gameId,
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));
  } catch (error) {
    await db
      .update(imports)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Error desconocido al analizar PDF.",
        updatedAt: new Date(),
      })
      .where(eq(imports.id, importId));
  }

  revalidatePath("/import");
  revalidatePath("/roster");
  revalidatePath("/dashboard");
}

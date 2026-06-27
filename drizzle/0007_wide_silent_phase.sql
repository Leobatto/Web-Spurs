CREATE TYPE "public"."game_phase" AS ENUM('regular', 'quarterfinal', 'semifinal', 'final');--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "phase" "game_phase" DEFAULT 'regular' NOT NULL;

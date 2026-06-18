CREATE TYPE "public"."match_status" AS ENUM('pending', 'resolved', 'created', 'ignored');--> statement-breakpoint
ALTER TYPE "public"."import_status" ADD VALUE 'analyzing' BEFORE 'extracted';--> statement-breakpoint
ALTER TYPE "public"."import_status" ADD VALUE 'analyzed' BEFORE 'extracted';--> statement-breakpoint
CREATE TABLE "player_match_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"raw_name" text NOT NULL,
	"raw_stats" jsonb,
	"suggested_player_id" text,
	"suggested_player_name" text,
	"created_player_id" text,
	"confidence" integer DEFAULT 0 NOT NULL,
	"status" "match_status" DEFAULT 'pending' NOT NULL,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q1_spurs" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q1_rival" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q2_spurs" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q2_rival" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q3_spurs" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q3_rival" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q4_spurs" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "q4_rival" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "summary_whatsapp" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "validation_notes" text;--> statement-breakpoint
ALTER TABLE "imports" ADD COLUMN "analysis_summary" text;--> statement-breakpoint
ALTER TABLE "imports" ADD COLUMN "unresolved_matches" integer DEFAULT 0 NOT NULL;
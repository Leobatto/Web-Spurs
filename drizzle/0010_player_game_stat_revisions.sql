CREATE TABLE "player_game_stat_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"player_game_stat_id" text NOT NULL,
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "player_game_stat_revisions_stat_idx" ON "player_game_stat_revisions" USING btree ("player_game_stat_id");

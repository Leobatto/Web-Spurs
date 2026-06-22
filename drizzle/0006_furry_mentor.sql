CREATE TABLE "tournaments" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "tournament_id" text;--> statement-breakpoint
ALTER TABLE "imports" ADD COLUMN "tournament_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_owner_name_idx" ON "tournaments" USING btree ("owner_user_id","name");
UPDATE "players"
SET "nickname" = 'Fanático',
    "photo_url" = '/players/juan-manuel-raggi.png'
WHERE lower("last_name") = 'raggi';

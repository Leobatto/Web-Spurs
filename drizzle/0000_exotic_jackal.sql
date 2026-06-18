CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."game_category" AS ENUM('PM', 'M');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('uploaded', 'extracted', 'reviewed', 'saved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'player');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"category" "game_category" NOT NULL,
	"opponent" text NOT NULL,
	"date" timestamp NOT NULL,
	"is_home" boolean DEFAULT true NOT NULL,
	"location" text,
	"final_score" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"status" "import_status" DEFAULT 'uploaded' NOT NULL,
	"raw_extraction" jsonb,
	"error" text,
	"game_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"fg_made" integer DEFAULT 0 NOT NULL,
	"fg_att" integer DEFAULT 0 NOT NULL,
	"two_made" integer DEFAULT 0 NOT NULL,
	"two_att" integer DEFAULT 0 NOT NULL,
	"three_made" integer DEFAULT 0 NOT NULL,
	"three_att" integer DEFAULT 0 NOT NULL,
	"ft_made" integer DEFAULT 0 NOT NULL,
	"ft_att" integer DEFAULT 0 NOT NULL,
	"off_reb" integer DEFAULT 0 NOT NULL,
	"def_reb" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"steals" integer DEFAULT 0 NOT NULL,
	"blocks" integer DEFAULT 0 NOT NULL,
	"turnovers" integer DEFAULT 0 NOT NULL,
	"fouls" integer DEFAULT 0 NOT NULL,
	"plus_minus" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"jersey_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'player' NOT NULL,
	"phone" text,
	"email_reports" boolean DEFAULT true NOT NULL,
	"player_id" text,
	"onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

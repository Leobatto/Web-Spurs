import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "write", "read"]);
export const gameCategoryEnum = pgEnum("game_category", ["PM", "M", "U"]);
export const gamePhaseEnum = pgEnum("game_phase", ["regular", "quarterfinal", "semifinal", "final"]);
export const importStatusEnum = pgEnum("import_status", [
  "uploaded",
  "analyzing",
  "analyzed",
  "extracted",
  "reviewed",
  "saved",
  "failed",
]);
export const matchStatusEnum = pgEnum("match_status", [
  "pending",
  "resolved",
  "created",
  "ignored",
]);
export const emailStatusEnum = pgEnum("email_status", [
  "pending",
  "sent",
  "failed",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("read"),
  phone: text("phone"),
  emailReports: boolean("email_reports").notNull().default(true),
  playerId: text("player_id"),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  lastName: text("last_name"),
  nickname: text("nickname"),
  photoUrl: text("photo_url"),
  jerseyNumber: integer("jersey_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueOwnerName: uniqueIndex("tournaments_owner_name_idx").on(table.ownerUserId, table.name),
}));

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  tournamentId: text("tournament_id"),
  category: gameCategoryEnum("category").notNull(),
  phase: gamePhaseEnum("phase").notNull().default("regular"),
  opponent: text("opponent").notNull(),
  date: timestamp("date").notNull(),
  isHome: boolean("is_home").notNull().default(true),
  location: text("location"),
  finalScore: text("final_score"),
  googleCalendarEventId: text("google_calendar_event_id"),
  q1Spurs: integer("q1_spurs"),
  q1Rival: integer("q1_rival"),
  q2Spurs: integer("q2_spurs"),
  q2Rival: integer("q2_rival"),
  q3Spurs: integer("q3_spurs"),
  q3Rival: integer("q3_rival"),
  q4Spurs: integer("q4_spurs"),
  q4Rival: integer("q4_rival"),
  summaryWhatsapp: text("summary_whatsapp"),
  validationNotes: text("validation_notes"),
  youtubeUrl: text("youtube_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const playerGameStats = pgTable("player_game_stats", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  playerId: text("player_id").notNull(),
  minutes: integer("minutes").notNull().default(0),
  points: integer("points").notNull().default(0),
  fgMade: integer("fg_made").notNull().default(0),
  fgAtt: integer("fg_att").notNull().default(0),
  twoMade: integer("two_made").notNull().default(0),
  twoAtt: integer("two_att").notNull().default(0),
  threeMade: integer("three_made").notNull().default(0),
  threeAtt: integer("three_att").notNull().default(0),
  ftMade: integer("ft_made").notNull().default(0),
  ftAtt: integer("ft_att").notNull().default(0),
  offReb: integer("off_reb").notNull().default(0),
  defReb: integer("def_reb").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  steals: integer("steals").notNull().default(0),
  blocks: integer("blocks").notNull().default(0),
  turnovers: integer("turnovers").notNull().default(0),
  fouls: integer("fouls").notNull().default(0),
  plusMinus: integer("plus_minus").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const playerGameStatRevisions = pgTable(
  "player_game_stat_revisions",
  {
    id: text("id").primaryKey(),
    playerGameStatId: text("player_game_stat_id").notNull(),
    gameId: text("game_id").notNull(),
    playerId: text("player_id").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    editedByUserId: text("edited_by_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueStat: uniqueIndex("player_game_stat_revisions_stat_idx").on(table.playerGameStatId),
  }),
);

export const imports = pgTable("imports", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  tournamentId: text("tournament_id"),
  fileName: text("file_name").notNull(),
  status: importStatusEnum("status").notNull().default("uploaded"),
  rawExtraction: jsonb("raw_extraction"),
  analysisSummary: text("analysis_summary"),
  unresolvedMatches: integer("unresolved_matches").notNull().default(0),
  error: text("error"),
  gameId: text("game_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqueOwnerFileName: uniqueIndex("imports_owner_file_name_idx").on(
    table.ownerUserId,
    table.fileName,
  ),
}));

export const playerMatchReviews = pgTable("player_match_reviews", {
  id: text("id").primaryKey(),
  importId: text("import_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  rawName: text("raw_name").notNull(),
  rawStats: jsonb("raw_stats"),
  suggestedPlayerId: text("suggested_player_id"),
  suggestedPlayerName: text("suggested_player_name"),
  createdPlayerId: text("created_player_id"),
  confidence: integer("confidence").notNull().default(0),
  status: matchStatusEnum("status").notNull().default("pending"),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emailDeliveries = pgTable("email_deliveries", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull(),
  playerId: text("player_id").notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  status: emailStatusEnum("status").notNull().default("pending"),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

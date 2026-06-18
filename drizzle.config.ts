import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";

function getEnv(name: string) {
  if (process.env[name]) {
    return process.env[name];
  }

  if (!existsSync(".env.local")) {
    return undefined;
  }

  const match = readFileSync(".env.local", "utf8").match(
    new RegExp(`^${name}=\\"?([^\\"\\n]+)\\"?`, "m"),
  );

  return match?.[1];
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnv("DATABASE_URL") ?? "",
  },
});

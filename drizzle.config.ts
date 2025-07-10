import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "./data/gitea-mirror.db",
  },
  verbose: true,
  strict: true,
  migrations: {
    table: "__drizzle_migrations",
    schema: "main",
  },
});
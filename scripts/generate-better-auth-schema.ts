#!/usr/bin/env bun

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Create a minimal auth instance just for schema generation
const tempDb = new Database(":memory:");
const db = drizzle({ client: tempDb });

// Minimal auth config for schema generation
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
});

// Generate the schema
// Note: $internal API is not available in current better-auth version
// const schema = auth.$internal.schema;

console.log("Better Auth Tables Required:");
console.log("============================");

// Convert Better Auth schema to Drizzle schema definitions
const drizzleSchemaCode = `// Better Auth Tables - Generated Schema
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql\`(unixepoch())\`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql\`(unixepoch())\`),
}, (table) => {
  return {
    userIdIdx: index("idx_sessions_user_id").on(table.userId),
    tokenIdx: index("idx_sessions_token").on(table.token),
    expiresAtIdx: index("idx_sessions_expires_at").on(table.expiresAt),
  };
});

// Accounts table (for OAuth providers and credentials)
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  providerId: text("provider_id").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  password: text("password"), // For credential provider
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql\`(unixepoch())\`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql\`(unixepoch())\`),
}, (table) => {
  return {
    userIdIdx: index("idx_accounts_user_id").on(table.userId),
    providerIdx: index("idx_accounts_provider").on(table.providerId, table.providerUserId),
  };
});

// Verification tokens table
export const verificationTokens = sqliteTable("verification_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  identifier: text("identifier").notNull(),
  type: text("type").notNull(), // email, password-reset, etc
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql\`(unixepoch())\`),
}, (table) => {
  return {
    tokenIdx: index("idx_verification_tokens_token").on(table.token),
    identifierIdx: index("idx_verification_tokens_identifier").on(table.identifier),
  };
});

// Future: SSO and OIDC Provider tables will be added when we enable those plugins
`;

console.log(drizzleSchemaCode);

// Output information about the schema
console.log("\n\nSummary:");
console.log("=========");
console.log("- Better Auth will modify the existing 'users' table");
console.log("- New tables required: sessions, accounts, verification_tokens");
console.log("\nNote: The 'users' table needs emailVerified field added");

tempDb.close();
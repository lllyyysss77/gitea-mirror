import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sso, oidcProvider } from "better-auth/plugins";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

// Generate or use existing JWT secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or BETTER_AUTH_SECRET environment variable is required");
}

// This function will be called with the actual database instance
export function createAuth(db: BunSQLiteDatabase) {
  return betterAuth({
    // Database configuration
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true, // Our tables use plural names (users, not user)
    }),

    // Base URL configuration
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

    // Authentication methods
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // We'll enable this later
      sendResetPassword: async ({ user, url, token }, request) => {
        // TODO: Implement email sending for password reset
        console.log("Password reset requested for:", user.email);
        console.log("Reset URL:", url);
      },
    },

    // Session configuration
    session: {
      cookieName: "better-auth-session",
      updateSessionCookieAge: true,
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },

    // User configuration
    user: {
      additionalFields: {
        // We can add custom fields here if needed
      },
    },

    // Plugins for future OIDC/SSO support
    plugins: [
      // SSO plugin for OIDC client support
      sso({
        provisionUser: async (data) => {
          // Custom user provisioning logic for SSO users
          console.log("Provisioning SSO user:", data);
          return data;
        },
      }),
      
      // OIDC Provider plugin (for future use when we want to be an OIDC provider)
      oidcProvider({
        loginPage: "/signin",
        consentPage: "/oauth/consent",
        metadata: {
          issuer: process.env.BETTER_AUTH_URL || "http://localhost:3000",
        },
      }),
    ],

    // Trusted origins for CORS
    trustedOrigins: [
      process.env.BETTER_AUTH_URL || "http://localhost:3000",
    ],
  });
}
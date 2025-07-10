import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

// Generate or use existing JWT secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or BETTER_AUTH_SECRET environment variable is required");
}

export const auth = betterAuth({
  // Database configuration
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true, // Our tables use plural names (users, not user)
  }),

  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth", // Specify the base path for auth endpoints

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
      // Keep the username field from our existing schema
      username: {
        type: "string",
        required: true,
        defaultValue: "user", // Default for migration
        input: true, // Allow in signup form
      }
    },
  },

  // TODO: Add plugins for SSO and OIDC support in the future
  // plugins: [],

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
});

// Export type for use in other parts of the app
export type Auth = typeof auth;
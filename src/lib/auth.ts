import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oidcProvider, sso } from "better-auth/plugins";
import { db, users } from "./db";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  // Database configuration
  database: drizzleAdapter(db, {
    provider: "sqlite",
    usePlural: true, // Our tables use plural names (users, not user)
    schema, // Pass the schema explicitly
  }),

  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET,

  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4321",
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
        required: false,
        input: false, // Don't show in signup form - we'll derive from email
      }
    },
  },

  // Plugins configuration
  plugins: [
    // OIDC Provider plugin - allows this app to act as an OIDC provider
    oidcProvider({
      loginPage: "/login",
      consentPage: "/oauth/consent",
      // Allow dynamic client registration for flexibility
      allowDynamicClientRegistration: true,
      // Customize user info claims based on scopes
      getAdditionalUserInfoClaim: (user, scopes) => {
        const claims: Record<string, any> = {};
        if (scopes.includes("profile")) {
          claims.username = user.username;
        }
        return claims;
      },
    }),
    
    // SSO plugin - allows users to authenticate with external OIDC providers
    sso({
      // Provision new users when they sign in with SSO
      provisionUser: async (user) => {
        // Derive username from email if not provided
        const username = user.name || user.email?.split('@')[0] || 'user';
        return {
          ...user,
          username,
        };
      },
      // Organization provisioning settings
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
      },
    }),
  ],

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:4321",
  ],
});

// Export type for use in other parts of the app
export type Auth = typeof auth;
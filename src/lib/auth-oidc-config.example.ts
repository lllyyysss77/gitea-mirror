/**
 * Example OIDC/SSO Configuration for Better Auth
 * 
 * This file demonstrates how to enable OIDC and SSO features in Gitea Mirror.
 * To use: Copy this file to auth-oidc-config.ts and update the auth.ts import.
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sso } from "better-auth/plugins/sso";
import { oidcProvider } from "better-auth/plugins/oidc";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export function createAuthWithOIDC(db: BunSQLiteDatabase) {
  return betterAuth({
    // Database configuration
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true,
    }),

    // Base configuration
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    basePath: "/api/auth",

    // Email/Password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    // Session configuration
    session: {
      cookieName: "better-auth-session",
      updateSessionCookieAge: true,
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },

    // User configuration with additional fields
    user: {
      additionalFields: {
        username: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: true,
        }
      },
    },

    // OAuth2 providers (examples)
    socialProviders: {
      github: {
        enabled: !!process.env.GITHUB_OAUTH_CLIENT_ID,
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
      },
      google: {
        enabled: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      },
    },

    // Plugins
    plugins: [
      // SSO Plugin - For OIDC/SAML client functionality
      sso({
        // Auto-provision users from SSO providers
        provisionUser: async (data) => {
          console.log("Provisioning SSO user:", data.email);
          
          // Custom logic to set username from email
          const username = data.email.split('@')[0];
          
          return {
            ...data,
            username,
          };
        },

        // Organization provisioning for enterprise SSO
        organizationProvisioning: {
          disabled: false,
          defaultRole: "member",
          getRole: async (user) => {
            // Custom logic to determine user role
            // For admin emails, grant admin role
            if (user.email?.endsWith('@admin.example.com')) {
              return 'admin';
            }
            return 'member';
          },
        },
      }),

      // OIDC Provider Plugin - Makes Gitea Mirror an OIDC provider
      oidcProvider({
        // Login page for OIDC authentication flow
        loginPage: "/login",
        
        // Consent page for OAuth2 authorization
        consentPage: "/oauth/consent",
        
        // Allow dynamic client registration
        allowDynamicClientRegistration: false,
        
        // OIDC metadata configuration
        metadata: {
          issuer: process.env.BETTER_AUTH_URL || "http://localhost:3000",
          authorization_endpoint: "/api/auth/oauth2/authorize",
          token_endpoint: "/api/auth/oauth2/token",
          userinfo_endpoint: "/api/auth/oauth2/userinfo",
          jwks_uri: "/api/auth/jwks",
        },

        // Additional user info claims
        getAdditionalUserInfoClaim: (user, scopes) => {
          const claims: Record<string, any> = {};
          
          // Add custom claims based on scopes
          if (scopes.includes('profile')) {
            claims.username = user.username;
            claims.preferred_username = user.username;
          }
          
          if (scopes.includes('gitea')) {
            // Add Gitea-specific claims
            claims.gitea_admin = false; // Customize based on your logic
            claims.gitea_repos = []; // Could fetch user's repositories
          }
          
          return claims;
        },
      }),
    ],

    // Trusted origins for CORS
    trustedOrigins: [
      process.env.BETTER_AUTH_URL || "http://localhost:3000",
      // Add your OIDC client domains here
    ],
  });
}

// Environment variables needed:
/*
# OAuth2 Providers (optional)
GITHUB_OAUTH_CLIENT_ID=your-github-client-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-client-secret
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret

# SSO Configuration (when registering providers)
SSO_PROVIDER_ISSUER=https://idp.example.com
SSO_PROVIDER_CLIENT_ID=your-client-id
SSO_PROVIDER_CLIENT_SECRET=your-client-secret
*/

// Example: Registering an SSO provider programmatically
/*
import { authClient } from "./auth-client";

// Register corporate SSO
await authClient.sso.register({
  issuer: "https://login.microsoftonline.com/tenant-id/v2.0",
  domain: "company.com",
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  providerId: "azure-ad",
  mapping: {
    id: "sub",
    email: "email",
    emailVerified: "email_verified",
    name: "name",
    image: "picture",
  },
});
*/
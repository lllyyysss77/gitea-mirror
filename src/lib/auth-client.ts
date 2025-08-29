import { createAuthClient } from "better-auth/react";
import { oidcClient } from "better-auth/client/plugins";
import { ssoClient } from "@better-auth/sso/client";
import type { Session as BetterAuthSession, User as BetterAuthUser } from "better-auth";

export const authClient = createAuthClient({
  // Use PUBLIC_BETTER_AUTH_URL if set (for multi-origin access), otherwise use current origin
  // This allows the client to connect to the auth server even when accessed from different origins
  baseURL: (() => {
    // Check for public environment variable first (for client-side access)
    if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BETTER_AUTH_URL) {
      return import.meta.env.PUBLIC_BETTER_AUTH_URL;
    }
    // Fall back to current origin if running in browser
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // Default for SSR
    return 'http://localhost:4321';
  })(),
  basePath: '/api/auth', // Explicitly set the base path
  plugins: [
    oidcClient(),
    ssoClient(),
  ],
});

// Export commonly used methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  sendVerificationEmail,
  resetPassword,
  requestPasswordReset,
  getSession
} = authClient;

// Export types - directly use the types from better-auth
export type Session = BetterAuthSession & {
  user: BetterAuthUser & {
    username?: string | null;
  };
};
export type AuthUser = BetterAuthUser & {
  username?: string | null;
};
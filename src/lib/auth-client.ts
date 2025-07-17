import { createAuthClient } from "better-auth/react";
import { oidcClient } from "better-auth/client/plugins";
import { ssoClient } from "better-auth/client/plugins";
import type { Session as BetterAuthSession, User as BetterAuthUser } from "better-auth";

export const authClient = createAuthClient({
  // The base URL is optional when running on the same domain
  // Better Auth will use the current domain by default
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
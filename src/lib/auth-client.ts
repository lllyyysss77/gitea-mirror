import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // The base URL is optional when running on the same domain
  // Better Auth will use the current domain by default
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

// Export types
export type Session = Awaited<ReturnType<typeof authClient.getSession>>["data"];
export type AuthUser = Session extends { user: infer U } ? U : never;
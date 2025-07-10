import * as React from "react";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  type Context,
} from "react";
import { authClient, useSession as useBetterAuthSession } from "@/lib/auth-client";
import type { Session, AuthUser } from "@/lib/auth-client";

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, username?: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext: Context<AuthContextType | undefined> = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const betterAuthSession = useBetterAuthSession();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Derive user and session from Better Auth hook
  const user = betterAuthSession.data?.user || null;
  const session = betterAuthSession.data || null;

  // Check if this is first load and redirect if needed
  useEffect(() => {
    const checkFirstUser = async () => {
      if (!betterAuthSession.isPending && !user) {
        try {
          // Check if there are any users in the system
          const response = await fetch("/api/auth/check-users");
          if (response.status === 404) {
            // No users found, redirect to signup
            window.location.href = "/signup";
          } else if (!window.location.pathname.includes("/login")) {
            // User not authenticated, redirect to login
            window.location.href = "/login";
          }
        } catch (err) {
          console.error("Failed to check users:", err);
        }
      }
    };

    checkFirstUser();
  }, [betterAuthSession.isPending, user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });
      
      if (result.error) {
        throw new Error(result.error.message || "Login failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: username, // Better Auth uses 'name' field
        username, // Also pass username as additional field
        callbackURL: "/dashboard",
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          },
        },
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    // Better Auth automatically handles session refresh
    // We can force a refetch if needed
    await betterAuthSession.refetch();
  };

  // Create the context value
  const contextValue = {
    user: user as AuthUser | null,
    session,
    isLoading: isLoading || betterAuthSession.isPending,
    error,
    login,
    register,
    logout,
    refreshUser,
  };

  // Return the provider with the context value
  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Export the Better Auth session hook for direct use when needed
export { useBetterAuthSession };
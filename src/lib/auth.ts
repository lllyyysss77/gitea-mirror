import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oidcProvider } from "better-auth/plugins";
import { sso } from "@better-auth/sso";
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

  // Base URL configuration - ensure it's a valid URL
  baseURL: (() => {
    const url = process.env.BETTER_AUTH_URL || "http://localhost:4321";
    try {
      // Validate URL format
      new URL(url);
      return url;
    } catch {
      console.warn(`Invalid BETTER_AUTH_URL: ${url}, falling back to localhost`);
      return "http://localhost:4321";
    }
  })(),
  basePath: "/api/auth", // Specify the base path for auth endpoints
  
  // Trusted origins for OAuth flows - parse from environment if set
  trustedOrigins: (() => {
    const origins = [
      "http://localhost:4321",
      "http://localhost:8080", // Keycloak
      process.env.BETTER_AUTH_URL || "http://localhost:4321"
    ];
    
    // Add trusted origins from environment if set
    if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
      origins.push(...process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(o => o.trim()));
    }
    
    return origins.filter(Boolean);
  })(),

  // Authentication methods
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // We'll enable this later
    sendResetPassword: async ({ user, url }) => {
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
      // Note: trustedClients would be configured here if Better Auth supports it
      // For now, we'll use dynamic registration
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
      provisionUser: async ({ user }: { user: any, userInfo: any }) => {
        // Derive username from email if not provided
        const username = user.name || user.email?.split('@')[0] || 'user';
        
        // Update user in database if needed
        await db.update(users)
          .set({ username })
          .where(eq(users.id, user.id))
          .catch(() => {}); // Ignore errors if user doesn't exist yet
      },
      // Organization provisioning settings
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
        getRole: async ({ userInfo }: { user: any, userInfo: any }) => {
          // Check if user has admin attribute from SSO provider
          const isAdmin = userInfo.attributes?.role === 'admin' ||
                         userInfo.attributes?.groups?.includes('admins');
          
          return isAdmin ? "admin" : "member";
        },
      },
      // Override user info with provider data by default
      defaultOverrideUserInfo: true,
      // Allow implicit sign up for new users
      disableImplicitSignUp: false,
    }),
  ],
});

// Export type for use in other parts of the app
export type Auth = typeof auth;
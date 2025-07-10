# Better Auth Migration Guide

This document describes the migration from the legacy authentication system to Better Auth.

## Overview

Gitea Mirror has been migrated to use Better Auth, a modern authentication library that provides:
- Built-in support for email/password authentication
- Session management with secure cookies
- Database adapter with Drizzle ORM
- Ready for OAuth2, OIDC, and SSO integrations
- Type-safe authentication throughout the application

## Key Changes

### 1. Database Schema

New tables added:
- `sessions` - User session management
- `accounts` - Authentication providers (credentials, OAuth, etc.)
- `verification_tokens` - Email verification and password reset tokens

Modified tables:
- `users` - Added `emailVerified` field

### 2. Authentication Flow

**Login:**
- Users now log in with email instead of username
- Endpoint: `/api/auth/sign-in/email`
- Session cookies are automatically managed

**Registration:**
- Users register with username, email, and password
- Username is stored as an additional field
- Endpoint: `/api/auth/sign-up/email`

### 3. API Routes

All auth routes are now handled by Better Auth's catch-all handler:
- `/api/auth/[...all].ts` handles all authentication endpoints

Legacy routes have been backed up to `/src/pages/api/auth/legacy-backup/`

### 4. Session Management

Sessions are now managed by Better Auth:
- Middleware automatically populates `context.locals.user` and `context.locals.session`
- Use `useAuth()` hook in React components for client-side auth
- Sessions expire after 30 days by default

## Future OIDC/SSO Configuration

The project is now ready for OIDC and SSO integrations. To enable:

### 1. Enable SSO Plugin

```typescript
// src/lib/auth.ts
import { sso } from "better-auth/plugins/sso";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    sso({
      provisionUser: async (data) => {
        // Custom user provisioning logic
        return data;
      },
    }),
  ],
});
```

### 2. Register OIDC Providers

```typescript
// Example: Register an OIDC provider
await authClient.sso.register({
  issuer: "https://idp.example.com",
  domain: "example.com",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  providerId: "example-provider",
});
```

### 3. Enable OIDC Provider Mode

To make Gitea Mirror act as an OIDC provider:

```typescript
// src/lib/auth.ts
import { oidcProvider } from "better-auth/plugins/oidc";

export const auth = betterAuth({
  // ... existing config
  plugins: [
    oidcProvider({
      loginPage: "/signin",
      consentPage: "/oauth/consent",
      metadata: {
        issuer: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      },
    }),
  ],
});
```

### 4. Database Migration for SSO

When enabling SSO/OIDC, run migrations to add required tables:

```bash
# Generate the schema
bun drizzle-kit generate

# Apply the migration
bun drizzle-kit migrate
```

New tables that will be added:
- `sso_providers` - SSO provider configurations
- `oauth_applications` - OAuth2 client applications
- `oauth_access_tokens` - OAuth2 access tokens
- `oauth_consents` - User consent records

## Environment Variables

Required environment variables:

```env
# Better Auth configuration
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Legacy (kept for compatibility)
JWT_SECRET=your-secret-key
```

## Migration Script

To migrate existing users to Better Auth:

```bash
bun run migrate:better-auth
```

This script:
1. Creates credential accounts for existing users
2. Moves password hashes to the accounts table
3. Preserves user creation dates

## Troubleshooting

### Login Issues
- Ensure users log in with email, not username
- Check that BETTER_AUTH_SECRET is set
- Verify database migrations have been applied

### Session Issues
- Clear browser cookies if experiencing session problems
- Check middleware is properly configured
- Ensure auth routes are accessible at `/api/auth/*`

### Development Tips
- Use `bun db:studio` to inspect database tables
- Check `/api/auth/session` to verify current session
- Enable debug logging in Better Auth for troubleshooting

## Resources

- [Better Auth Documentation](https://better-auth.com)
- [Better Auth Astro Integration](https://better-auth.com/docs/integrations/astro)
- [Better Auth Plugins](https://better-auth.com/docs/plugins)
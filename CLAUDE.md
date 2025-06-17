# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gitea Mirror is a web application that automatically mirrors repositories from GitHub to self-hosted Gitea instances. It uses Astro for SSR, React for UI, SQLite for data storage, and Bun as the JavaScript runtime.

## Essential Commands

### Development
```bash
bun run dev          # Start development server (port 3000)
bun run build        # Build for production
bun run preview      # Preview production build
```

### Testing
```bash
bun test             # Run all tests
bun test:watch       # Run tests in watch mode
bun test:coverage    # Run tests with coverage
```

### Database Management
```bash
bun run init-db      # Initialize database
bun run reset-users  # Reset user accounts (development)
bun run cleanup-db   # Remove database files
```

### Production
```bash
bun run start        # Start production server
```

## Architecture & Key Concepts

### Technology Stack
- **Frontend**: Astro (SSR) + React + Tailwind CSS v4 + Shadcn UI
- **Backend**: Bun runtime + SQLite + Drizzle ORM
- **APIs**: GitHub (Octokit) and Gitea APIs
- **Auth**: JWT tokens with bcryptjs password hashing

### Project Structure
- `/src/pages/api/` - API endpoints (Astro API routes)
- `/src/components/` - React components organized by feature
- `/src/lib/db/` - Database queries and schema (Drizzle ORM)
- `/src/hooks/` - Custom React hooks for data fetching
- `/data/` - SQLite database storage location

### Key Architectural Patterns

1. **API Routes**: All API endpoints follow the pattern `/api/[resource]/[action]` and use `createSecureErrorResponse` for consistent error handling:
```typescript
import { createSecureErrorResponse } from '@/lib/utils/error-handler';

export async function POST({ request }: APIContext) {
  try {
    // Implementation
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
```

2. **Database Queries**: Located in `/src/lib/db/queries/` organized by domain (users, repositories, etc.)

3. **Real-time Updates**: Server-Sent Events (SSE) endpoint at `/api/events` for live dashboard updates

4. **Authentication Flow**: 
   - First user signup creates admin account
   - JWT tokens stored in cookies
   - Protected routes check auth via `getUserFromCookie()`

5. **Mirror Process**:
   - Discovers repos from GitHub (user/org)
   - Creates/updates mirror in Gitea
   - Tracks status in database
   - Supports scheduled automatic mirroring

6. **Mirror Strategies**: Three ways to organize repositories in Gitea:
   - **preserve**: Maintains GitHub structure (default)
   - **single-org**: All repos go to one organization
   - **flat-user**: All repos go under user account
   - Starred repos always go to separate organization (starredReposOrg)
   - Routing logic in `getGiteaRepoOwner()` function

### Database Schema (SQLite)
- `users` - User accounts and authentication
- `configs` - GitHub/Gitea connection settings
- `repositories` - Repository mirror status and metadata
- `organizations` - Organization structure preservation
- `mirror_jobs` - Scheduled mirror operations
- `events` - Activity log and notifications

### Testing Approach
- Uses Bun's native test runner (`bun:test`)
- Test files use `.test.ts` or `.test.tsx` extension
- Setup file at `/src/tests/setup.bun.ts`
- Mock utilities available for API testing

### Development Tips
- Environment variables in `.env` (copy from `.env.example`)
- JWT_SECRET auto-generated if not provided
- Database auto-initializes on first run
- Use `bun run dev:clean` for fresh database start
- Tailwind CSS v4 configured with Vite plugin

### Common Tasks

**Adding a new API endpoint:**
1. Create file in `/src/pages/api/[resource]/[action].ts`
2. Use `createSecureErrorResponse` for error handling
3. Add corresponding database query in `/src/lib/db/queries/`
4. Update types in `/src/types/` if needed

**Adding a new component:**
1. Create in appropriate `/src/components/[feature]/` directory
2. Use Shadcn UI components from `/src/components/ui/`
3. Follow existing naming patterns (e.g., `RepositoryCard`, `ConfigTabs`)

**Modifying database schema:**
1. Update schema in `/src/lib/db/schema.ts`
2. Run `bun run init-db` to recreate database
3. Update related queries in `/src/lib/db/queries/`



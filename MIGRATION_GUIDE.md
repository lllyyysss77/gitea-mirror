# Migration Guide

This guide covers database migrations and version upgrades for Gitea Mirror.

## Version 3.0 Migration Guide

### Overview of v3 Changes

Version 3.0 introduces significant security improvements and authentication changes:
- **Token Encryption**: All GitHub and Gitea tokens are now encrypted in the database
- **Better Auth**: Complete authentication system overhaul with session-based auth
- **SSO/OIDC Support**: Enterprise authentication options
- **Enhanced Security**: Improved error handling and security practices

### Breaking Changes in v3

#### 1. Authentication System Overhaul
- Users now log in with **email** instead of username
- Session-based authentication replaces JWT tokens
- New auth endpoints: `/api/auth/[...all]` instead of `/api/auth/login`
- Password reset may be required for existing users

#### 2. Token Encryption
- All stored GitHub and Gitea tokens are encrypted using AES-256-GCM
- Requires encryption secret configuration
- Existing unencrypted tokens must be migrated

#### 3. Environment Variables
**Required changes:**
- `JWT_SECRET` → `BETTER_AUTH_SECRET` (backward compatible)
- New: `BETTER_AUTH_URL` (required)
- New: `ENCRYPTION_SECRET` (recommended)

#### 4. Database Schema Updates
New tables added:
- `sessions` - User session management
- `accounts` - Authentication accounts
- `verification_tokens` - Email verification
- `oauth_applications` - OAuth app registrations
- `sso_providers` - SSO configuration

### Migration Steps from v2 to v3

**⚠️ IMPORTANT: Backup your database before upgrading!**

```bash
cp data/gitea-mirror.db data/gitea-mirror.db.backup
```

#### Automated Migration (Docker Compose)

For Docker Compose users, v3 migration is **fully automated**:

1. **Update your docker-compose.yml** to use v3:
```yaml
services:
  gitea-mirror:
    image: ghcr.io/raylabshq/gitea-mirror:v3
```

2. **Pull and restart the container**:
```bash
docker compose pull
docker compose down
docker compose up -d
```

**That's it!** The container will automatically:
- ✅ Generate BETTER_AUTH_SECRET (from existing JWT_SECRET if available)
- ✅ Generate ENCRYPTION_SECRET for token encryption
- ✅ Create Better Auth database tables
- ✅ Migrate existing users to Better Auth system
- ✅ Encrypt all stored GitHub/Gitea tokens
- ✅ Apply all necessary database migrations

#### Manual Migration (Non-Docker)

#### Step 1: Update Environment Variables
Add to your `.env` file:
```bash
# Set your application URL (required)
BETTER_AUTH_URL=http://localhost:4321  # or your production URL

# Optional: These will be auto-generated if not provided
# BETTER_AUTH_SECRET=your-existing-jwt-secret  # Will use existing JWT_SECRET
# ENCRYPTION_SECRET=your-48-character-secret   # Will be auto-generated
```

#### Step 2: Stop the Application
```bash
# Stop your running instance
pkill -f "bun run start" # or your process manager command
```

#### Step 3: Update to v3
```bash
# Pull latest changes
git pull origin v3

# Install dependencies
bun install
```

#### Step 4: Run Migrations
```bash
# Option 1: Automatic migration on startup
bun run build
bun run start  # Migrations run automatically

# Option 2: Manual migration
bun run migrate:better-auth      # Migrate users to Better Auth
bun run migrate:encrypt-tokens   # Encrypt stored tokens
```

### Post-Migration Tasks

1. **All users must log in again** - Sessions are invalidated
2. **Users log in with email** - Not username anymore
3. **Check token encryption** - Verify GitHub/Gitea connections still work
4. **Update API integrations** - Switch to new auth endpoints

### Troubleshooting v3 Migration

#### Users Can't Log In
- Ensure they're using email, not username
- They may need to reset password if migration failed
- Check Better Auth migration logs

#### Token Decryption Errors
- Verify ENCRYPTION_SECRET is set correctly
- Re-run token encryption migration
- Users may need to re-enter tokens

#### Database Errors
- Ensure all migrations completed
- Check disk space for new tables
- Review migration logs in console

### Rollback Procedure
If migration fails:
```bash
# Stop application
pkill -f "bun run start"

# Restore database backup
cp data/gitea-mirror.db.backup data/gitea-mirror.db

# Checkout previous version
git checkout v2.22.0

# Restart with old version
bun run start
```

---

## Drizzle Kit Migration Guide

This project uses Drizzle Kit for database migrations, providing better schema management and migration tracking.

## Overview

- **Database**: SQLite (with preparation for future PostgreSQL migration)
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Schema Location**: `/src/lib/db/schema.ts`
- **Migrations Folder**: `/drizzle`
- **Configuration**: `/drizzle.config.ts`

## Available Commands

### Database Management
- `bun run init-db` - Initialize database with all migrations
- `bun run check-db` - Check database status and recent migrations
- `bun run reset-users` - Remove all users and related data
- `bun run cleanup-db` - Remove database files

### Drizzle Kit Commands
- `bun run db:generate` - Generate new migration files from schema changes
- `bun run db:migrate` - Apply pending migrations to database
- `bun run db:push` - Push schema changes directly (development)
- `bun run db:pull` - Pull schema from database
- `bun run db:check` - Check for migration issues
- `bun run db:studio` - Open Drizzle Studio for database browsing

## Making Schema Changes

1. **Update Schema**: Edit `/src/lib/db/schema.ts`
2. **Generate Migration**: Run `bun run db:generate`
3. **Review Migration**: Check the generated SQL in `/drizzle` folder
4. **Apply Migration**: Run `bun run db:migrate` or restart the application

## Migration Process

The application automatically runs migrations on startup:
- Checks for pending migrations
- Creates migrations table if needed
- Applies all pending migrations in order
- Tracks migration history

## Schema Organization

### Tables
- `users` - User authentication and accounts
- `configs` - GitHub/Gitea configurations
- `repositories` - Repository mirror tracking
- `organizations` - GitHub organizations
- `mirror_jobs` - Job tracking with resilience
- `events` - Real-time event notifications

### Indexes
All performance-critical indexes are automatically created:
- User lookups
- Repository status queries
- Organization filtering
- Job tracking
- Event channels

## Future PostgreSQL Migration

The setup is designed for easy PostgreSQL migration:

1. Update `drizzle.config.ts`:
```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});
```

2. Update connection in `/src/lib/db/index.ts`
3. Generate new migrations: `bun run db:generate`
4. Apply to PostgreSQL: `bun run db:migrate`

## Troubleshooting

### Migration Errors
- Check `/drizzle` folder for migration files
- Verify database permissions
- Review migration SQL for conflicts

### Schema Conflicts
- Use `bun run db:check` to identify issues
- Review generated migrations before applying
- Keep schema.ts as single source of truth
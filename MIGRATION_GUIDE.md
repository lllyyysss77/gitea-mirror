# Drizzle Kit Migration Guide

This project now uses Drizzle Kit for database migrations, providing better schema management and migration tracking.

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
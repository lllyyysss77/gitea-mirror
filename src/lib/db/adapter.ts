/**
 * Database adapter for SQLite
 * For the self-hosted version of Gitea Mirror
 */

import { drizzle as drizzleSqlite } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

export type DatabaseClient = ReturnType<typeof createDatabase>;

/**
 * Create SQLite database connection
 */
export function createDatabase() {
  const dbPath = process.env.DATABASE_PATH || './data/gitea-mirror.db';
  
  // Ensure directory exists
  const fs = require('fs');
  const path = require('path');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create SQLite connection
  const sqlite = new Database(dbPath);
  
  // Enable foreign keys and WAL mode for better performance
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA synchronous = NORMAL');
  sqlite.exec('PRAGMA cache_size = -2000'); // 2MB cache
  sqlite.exec('PRAGMA temp_store = MEMORY');
  
  // Create Drizzle instance with SQLite
  const db = drizzleSqlite(sqlite, { 
    schema,
    logger: process.env.NODE_ENV === 'development',
  });
  
  return {
    db,
    client: sqlite,
    type: 'sqlite' as const,
    
    // Helper methods
    async close() {
      sqlite.close();
    },
    
    async healthCheck() {
      try {
        sqlite.query('SELECT 1').get();
        return true;
      } catch {
        return false;
      }
    },
    
    async transaction<T>(fn: (tx: any) => Promise<T>) {
      return db.transaction(fn);
    },
  };
}

// Create singleton instance
let dbInstance: DatabaseClient | null = null;

/**
 * Get database instance (singleton)
 */
export function getDatabase(): DatabaseClient {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

// Export convenience references
export const { db, client, type: dbType } = getDatabase();

// Re-export schema for convenience
export * from './schema';

/**
 * Database migration utilities
 */
export async function runMigrations() {
  const { migrate } = await import('drizzle-orm/bun-sqlite/migrator');
  await migrate(db, { migrationsFolder: './drizzle' });
}
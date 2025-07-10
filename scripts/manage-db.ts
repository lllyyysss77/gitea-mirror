import fs from "fs";
import path from "path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { v4 as uuidv4 } from "uuid";
import { users, configs, repositories, organizations, mirrorJobs, events } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Command line arguments
const args = process.argv.slice(2);
const command = args[0] || "check";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database path - ensure we use absolute path
const dbPath = path.join(dataDir, "gitea-mirror.db");

/**
 * Initialize database with migrations
 */
async function initDatabase() {
  console.log("📦 Initializing database...");
  
  // Create an empty database file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }

  // Create SQLite instance
  const sqlite = new Database(dbPath);
  const db = drizzle({ client: sqlite });

  // Run migrations
  console.log("🔄 Running migrations...");
  try {
    migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
    throw error;
  }

  sqlite.close();
  console.log("✅ Database initialized successfully");
}

/**
 * Check database status
 */
async function checkDatabase() {
  console.log("🔍 Checking database status...");
  
  if (!fs.existsSync(dbPath)) {
    console.log("❌ Database does not exist at:", dbPath);
    console.log("💡 Run 'bun run init-db' to create the database");
    process.exit(1);
  }

  const sqlite = new Database(dbPath);
  const db = drizzle({ client: sqlite });

  try {
    // Check tables
    const tables = sqlite.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{name: string}>;

    console.log("\n📊 Tables found:");
    for (const table of tables) {
      const count = sqlite.query(`SELECT COUNT(*) as count FROM ${table.name}`).get() as {count: number};
      console.log(`  - ${table.name}: ${count.count} records`);
    }

    // Check migrations
    const migrations = sqlite.query(
      "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5"
    ).all() as Array<{hash: string, created_at: number}>;

    if (migrations.length > 0) {
      console.log("\n📋 Recent migrations:");
      for (const migration of migrations) {
        const date = new Date(migration.created_at);
        console.log(`  - ${migration.hash} (${date.toLocaleString()})`);
      }
    }

    sqlite.close();
    console.log("\n✅ Database check complete");
  } catch (error) {
    console.error("❌ Error checking database:", error);
    sqlite.close();
    process.exit(1);
  }
}

/**
 * Reset user accounts (development only)
 */
async function resetUsers() {
  console.log("🗑️  Resetting all user accounts...");
  
  if (!fs.existsSync(dbPath)) {
    console.log("❌ Database does not exist");
    process.exit(1);
  }

  const sqlite = new Database(dbPath);
  const db = drizzle({ client: sqlite });

  try {
    // Delete all data in order of foreign key dependencies
    await db.delete(events);
    await db.delete(mirrorJobs);
    await db.delete(repositories);
    await db.delete(organizations);
    await db.delete(configs);
    await db.delete(users);

    console.log("✅ All user accounts and related data have been removed");
    
    sqlite.close();
  } catch (error) {
    console.error("❌ Error resetting users:", error);
    sqlite.close();
    process.exit(1);
  }
}

/**
 * Clean up database files
 */
async function cleanupDatabase() {
  console.log("🧹 Cleaning up database files...");
  
  const filesToRemove = [
    dbPath,
    path.join(dataDir, "gitea-mirror-dev.db"),
    path.join(process.cwd(), "gitea-mirror.db"),
    path.join(process.cwd(), "gitea-mirror-dev.db"),
  ];

  for (const file of filesToRemove) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`  - Removed: ${file}`);
    }
  }

  console.log("✅ Database cleanup complete");
}

/**
 * Fix database location issues
 */
async function fixDatabase() {
  console.log("🔧 Fixing database location issues...");
  
  // Legacy database paths
  const rootDbFile = path.join(process.cwd(), "gitea-mirror.db");
  const rootDevDbFile = path.join(process.cwd(), "gitea-mirror-dev.db");
  const dataDevDbFile = path.join(dataDir, "gitea-mirror-dev.db");

  // Check for databases in wrong locations
  if (fs.existsSync(rootDbFile)) {
    console.log("📁 Found database in root directory");
    if (!fs.existsSync(dbPath)) {
      console.log("  → Moving to data directory...");
      fs.renameSync(rootDbFile, dbPath);
      console.log("✅ Database moved successfully");
    } else {
      console.log("  ⚠️  Database already exists in data directory");
      console.log("  → Keeping existing data directory database");
      fs.unlinkSync(rootDbFile);
      console.log("  → Removed root directory database");
    }
  }

  // Clean up dev databases
  if (fs.existsSync(rootDevDbFile)) {
    fs.unlinkSync(rootDevDbFile);
    console.log("  → Removed root dev database");
  }
  if (fs.existsSync(dataDevDbFile)) {
    fs.unlinkSync(dataDevDbFile);
    console.log("  → Removed data dev database");
  }

  console.log("✅ Database location fixed");
}

/**
 * Auto mode - check and initialize if needed
 */
async function autoMode() {
  if (!fs.existsSync(dbPath)) {
    console.log("📦 Database not found, initializing...");
    await initDatabase();
  } else {
    console.log("✅ Database already exists");
    await checkDatabase();
  }
}

// Execute command
switch (command) {
  case "init":
    await initDatabase();
    break;
  case "check":
    await checkDatabase();
    break;
  case "fix":
    await fixDatabase();
    break;
  case "reset-users":
    await resetUsers();
    break;
  case "cleanup":
    await cleanupDatabase();
    break;
  case "auto":
    await autoMode();
    break;
  default:
    console.log("Available commands:");
    console.log("  init         - Initialize database with migrations");
    console.log("  check        - Check database status");
    console.log("  fix          - Fix database location issues");
    console.log("  reset-users  - Remove all users and related data");
    console.log("  cleanup      - Remove all database files");
    console.log("  auto         - Auto initialize if needed");
    process.exit(1);
}
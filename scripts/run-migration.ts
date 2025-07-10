import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data/gitea-mirror.db");
const db = new Database(dbPath);

// Read the migration file
const migrationPath = path.join(process.cwd(), "drizzle/0001_polite_exodus.sql");
const migration = readFileSync(migrationPath, "utf-8");

// Split by statement-breakpoint and execute each statement
const statements = migration.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s);

try {
  db.run("BEGIN TRANSACTION");
  
  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 50)}...`);
    db.run(statement);
  }
  
  db.run("COMMIT");
  console.log("Migration completed successfully!");
} catch (error) {
  db.run("ROLLBACK");
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
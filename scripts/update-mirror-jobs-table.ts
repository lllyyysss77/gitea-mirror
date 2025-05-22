#!/usr/bin/env bun
/**
 * Script to update the mirror_jobs table with new columns for resilience
 */

import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";

// Define the database paths
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "gitea-mirror.db");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found at ${dbPath}`);
  console.error("Please run 'bun run init-db' first to create the database.");
  process.exit(1);
}

// Connect to the database
const db = new Database(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON;");

// Function to check if a column exists in a table
function columnExists(tableName: string, columnName: string): boolean {
  const result = db.query(
    `PRAGMA table_info(${tableName})`
  ).all() as { name: string }[];
  
  return result.some(column => column.name === columnName);
}

// Main function to update the mirror_jobs table
async function updateMirrorJobsTable() {
  console.log("Checking mirror_jobs table for missing columns...");
  
  // Start a transaction
  db.exec("BEGIN TRANSACTION;");
  
  try {
    // Check and add each new column if it doesn't exist
    const columnsToAdd = [
      { name: "job_type", definition: "TEXT NOT NULL DEFAULT 'mirror'" },
      { name: "batch_id", definition: "TEXT" },
      { name: "total_items", definition: "INTEGER" },
      { name: "completed_items", definition: "INTEGER DEFAULT 0" },
      { name: "item_ids", definition: "TEXT" }, // JSON array as text
      { name: "completed_item_ids", definition: "TEXT DEFAULT '[]'" }, // JSON array as text
      { name: "in_progress", definition: "INTEGER NOT NULL DEFAULT 0" }, // Boolean as integer
      { name: "started_at", definition: "TIMESTAMP" },
      { name: "completed_at", definition: "TIMESTAMP" },
      { name: "last_checkpoint", definition: "TIMESTAMP" }
    ];
    
    let columnsAdded = 0;
    
    for (const column of columnsToAdd) {
      if (!columnExists("mirror_jobs", column.name)) {
        console.log(`Adding column '${column.name}' to mirror_jobs table...`);
        db.exec(`ALTER TABLE mirror_jobs ADD COLUMN ${column.name} ${column.definition};`);
        columnsAdded++;
      }
    }
    
    // Commit the transaction
    db.exec("COMMIT;");
    
    if (columnsAdded > 0) {
      console.log(`✅ Added ${columnsAdded} new columns to mirror_jobs table.`);
    } else {
      console.log("✅ All required columns already exist in mirror_jobs table.");
    }
    
    // Create indexes for better performance
    console.log("Creating indexes for mirror_jobs table...");
    
    // Only create indexes if they don't exist
    const indexesResult = db.query(
      `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='mirror_jobs'`
    ).all() as { name: string }[];
    
    const existingIndexes = indexesResult.map(idx => idx.name);
    
    const indexesToCreate = [
      { name: "idx_mirror_jobs_user_id", columns: "user_id" },
      { name: "idx_mirror_jobs_batch_id", columns: "batch_id" },
      { name: "idx_mirror_jobs_in_progress", columns: "in_progress" },
      { name: "idx_mirror_jobs_job_type", columns: "job_type" },
      { name: "idx_mirror_jobs_timestamp", columns: "timestamp" }
    ];
    
    let indexesCreated = 0;
    
    for (const index of indexesToCreate) {
      if (!existingIndexes.includes(index.name)) {
        console.log(`Creating index '${index.name}'...`);
        db.exec(`CREATE INDEX ${index.name} ON mirror_jobs(${index.columns});`);
        indexesCreated++;
      }
    }
    
    if (indexesCreated > 0) {
      console.log(`✅ Created ${indexesCreated} new indexes for mirror_jobs table.`);
    } else {
      console.log("✅ All required indexes already exist for mirror_jobs table.");
    }
    
    console.log("Mirror jobs table update completed successfully.");
  } catch (error) {
    // Rollback the transaction in case of error
    db.exec("ROLLBACK;");
    console.error("❌ Error updating mirror_jobs table:", error);
    process.exit(1);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the update function
updateMirrorJobsTable().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

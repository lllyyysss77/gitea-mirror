#!/usr/bin/env bun
/**
 * Database migration script to add the events table
 * This script should be run when upgrading from a version that used Redis
 */

import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";

// Define the database path
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "gitea-mirror.db");
if (!fs.existsSync(dbPath)) {
  console.error("Database file not found:", dbPath);
  process.exit(1);
}

// Open the database
const db = new Database(dbPath);

// Check if the events table already exists
const tableExists = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();

if (tableExists) {
  console.log("Events table already exists, skipping migration");
  process.exit(0);
}

// Create the events table
console.log("Creating events table...");
db.exec(`
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  payload TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_events_user_channel ON events(user_id, channel);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_read ON events(read);
`);

console.log("Migration completed successfully");

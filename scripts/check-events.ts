#!/usr/bin/env bun
/**
 * Script to check events in the database
 */

import { Database } from "bun:sqlite";
import path from "path";
import fs from "fs";

// Define the database path
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  console.error("Data directory not found:", dataDir);
  process.exit(1);
}

const dbPath = path.join(dataDir, "gitea-mirror.db");
if (!fs.existsSync(dbPath)) {
  console.error("Database file not found:", dbPath);
  process.exit(1);
}

// Open the database
const db = new Database(dbPath);

// Check if the events table exists
const tableExists = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();

if (!tableExists) {
  console.error("Events table does not exist");
  process.exit(1);
}

// Get all events
const events = db.query("SELECT * FROM events").all();

console.log("Events in the database:");
console.log(JSON.stringify(events, null, 2));

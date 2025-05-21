#!/usr/bin/env bun
/**
 * Cleanup script to remove Redis-related files and code
 * This script should be run when migrating from Redis to SQLite
 */

import fs from "fs";
import path from "path";

// Files to remove
const filesToRemove = [
  "src/lib/redis.ts"
];

// Remove files
console.log("Removing Redis-related files...");
for (const file of filesToRemove) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Removed: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}

console.log("\nRedis cleanup completed successfully");
console.log("\nReminder: You should also remove Redis from your Docker Compose files and environment variables.");
console.log("The following files have been updated to use SQLite instead of Redis:");
console.log("- src/lib/helpers.ts");
console.log("- src/pages/api/sse/index.ts");
console.log("\nNew files created:");
console.log("- src/lib/events.ts");

#!/usr/bin/env bun
/**
 * Script to clean up old events from the database
 * This script should be run periodically (e.g., daily) to prevent the events table from growing too large
 *
 * Usage:
 *   bun scripts/cleanup-events.ts [days]
 *
 * Where [days] is the number of days to keep events (default: 7)
 */

import { cleanupOldEvents } from "../src/lib/events";

// Parse command line arguments
const args = process.argv.slice(2);
const daysToKeep = args.length > 0 ? parseInt(args[0], 10) : 7;

if (isNaN(daysToKeep) || daysToKeep < 1) {
  console.error("Error: Days to keep must be a positive number");
  process.exit(1);
}

async function runCleanup() {
  try {
    console.log(`Starting event cleanup (retention: ${daysToKeep} days)...`);

    // Call the cleanupOldEvents function from the events module
    const result = await cleanupOldEvents(daysToKeep);

    console.log(`Cleanup summary:`);
    console.log(`- Read events deleted: ${result.readEventsDeleted}`);
    console.log(`- Unread events deleted: ${result.unreadEventsDeleted}`);
    console.log(`- Total events deleted: ${result.readEventsDeleted + result.unreadEventsDeleted}`);

    console.log("Event cleanup completed successfully");
  } catch (error) {
    console.error("Error running event cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();

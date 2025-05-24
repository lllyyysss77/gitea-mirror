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

import { cleanupOldEvents, removeDuplicateEvents } from "../src/lib/events";

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

    // First, remove duplicate events
    console.log("Step 1: Removing duplicate events...");
    const duplicateResult = await removeDuplicateEvents();
    console.log(`- Duplicate events removed: ${duplicateResult.duplicatesRemoved}`);

    // Then, clean up old events
    console.log("Step 2: Cleaning up old events...");
    const result = await cleanupOldEvents(daysToKeep);

    console.log(`Cleanup summary:`);
    console.log(`- Duplicate events removed: ${duplicateResult.duplicatesRemoved}`);
    console.log(`- Read events deleted: ${result.readEventsDeleted}`);
    console.log(`- Unread events deleted: ${result.unreadEventsDeleted}`);
    console.log(`- Total events deleted: ${result.readEventsDeleted + result.unreadEventsDeleted + duplicateResult.duplicatesRemoved}`);

    console.log("Event cleanup completed successfully");
  } catch (error) {
    console.error("Error running event cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup();

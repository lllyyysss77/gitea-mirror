#!/usr/bin/env bun
/**
 * Script to remove duplicate events from the database
 * This script identifies and removes events with duplicate deduplication keys
 *
 * Usage:
 *   bun scripts/remove-duplicate-events.ts [userId]
 *
 * Where [userId] is optional - if provided, only removes duplicates for that user
 */

import { removeDuplicateEvents } from "../src/lib/events";

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args.length > 0 ? args[0] : undefined;

async function runDuplicateRemoval() {
  try {
    if (userId) {
      console.log(`Starting duplicate event removal for user: ${userId}...`);
    } else {
      console.log("Starting duplicate event removal for all users...");
    }

    // Call the removeDuplicateEvents function
    const result = await removeDuplicateEvents(userId);

    console.log(`Duplicate removal summary:`);
    console.log(`- Duplicate events removed: ${result.duplicatesRemoved}`);

    if (result.duplicatesRemoved > 0) {
      console.log("Duplicate event removal completed successfully");
    } else {
      console.log("No duplicate events found");
    }
  } catch (error) {
    console.error("Error running duplicate event removal:", error);
    process.exit(1);
  }
}

// Run the duplicate removal
runDuplicateRemoval();

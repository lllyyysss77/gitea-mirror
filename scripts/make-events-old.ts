#!/usr/bin/env bun
/**
 * Script to make events appear older for testing cleanup
 */

import { db, events } from "../src/lib/db";

async function makeEventsOld() {
  try {
    console.log("Making events appear older...");
    
    // Calculate a timestamp from 2 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2);
    
    // Update all events to have an older timestamp
    const result = await db
      .update(events)
      .set({ createdAt: oldDate });
    
    console.log(`Updated ${result.changes || 0} events to appear older`);
  } catch (error) {
    console.error("Error updating event timestamps:", error);
    process.exit(1);
  }
}

// Run the function
makeEventsOld();

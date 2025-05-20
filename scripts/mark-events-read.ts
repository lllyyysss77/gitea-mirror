#!/usr/bin/env bun
/**
 * Script to mark all events as read
 */

import { db, events } from "../src/lib/db";
import { eq } from "drizzle-orm";

async function markEventsAsRead() {
  try {
    console.log("Marking all events as read...");
    
    // Update all events to mark them as read
    const result = await db
      .update(events)
      .set({ read: true })
      .where(eq(events.read, false));
    
    console.log(`Marked ${result.changes || 0} events as read`);
  } catch (error) {
    console.error("Error marking events as read:", error);
    process.exit(1);
  }
}

// Run the function
markEventsAsRead();

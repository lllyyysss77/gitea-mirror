import { v4 as uuidv4 } from "uuid";
import { db, events } from "./db";
import { eq, and, gt } from "drizzle-orm";

/**
 * Publishes an event to a specific channel for a user
 * This replaces Redis pub/sub with SQLite storage
 */
export async function publishEvent({
  userId,
  channel,
  payload,
}: {
  userId: string;
  channel: string;
  payload: any;
}): Promise<string> {
  try {
    const eventId = uuidv4();
    console.log(`Publishing event to channel ${channel} for user ${userId}`);

    // Insert the event into the SQLite database
    await db.insert(events).values({
      id: eventId,
      userId,
      channel,
      payload: JSON.stringify(payload),
      createdAt: new Date(),
    });

    console.log(`Event published successfully with ID ${eventId}`);
    return eventId;
  } catch (error) {
    console.error("Error publishing event:", error);
    throw new Error("Failed to publish event");
  }
}

/**
 * Gets new events for a specific user and channel
 * This replaces Redis subscribe with SQLite polling
 */
export async function getNewEvents({
  userId,
  channel,
  lastEventTime,
}: {
  userId: string;
  channel: string;
  lastEventTime?: Date;
}): Promise<any[]> {
  try {
    console.log(`Getting new events for user ${userId} in channel ${channel}`);
    if (lastEventTime) {
      console.log(`Looking for events after ${lastEventTime.toISOString()}`);
    }

    // Build the query
    let query = db
      .select()
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.channel, channel),
          eq(events.read, false)
        )
      )
      .orderBy(events.createdAt);

    // Add time filter if provided
    if (lastEventTime) {
      query = query.where(gt(events.createdAt, lastEventTime));
    }

    // Execute the query
    const newEvents = await query;
    console.log(`Found ${newEvents.length} new events`);

    // Mark events as read
    if (newEvents.length > 0) {
      console.log(`Marking ${newEvents.length} events as read`);
      await db
        .update(events)
        .set({ read: true })
        .where(
          and(
            eq(events.userId, userId),
            eq(events.channel, channel),
            eq(events.read, false)
          )
        );
    }

    // Parse the payloads
    return newEvents.map(event => ({
      ...event,
      payload: JSON.parse(event.payload as string),
    }));
  } catch (error) {
    console.error("Error getting new events:", error);
    return [];
  }
}

/**
 * Cleans up old events to prevent the database from growing too large
 * Should be called periodically (e.g., daily via a cron job)
 */
export async function cleanupOldEvents(maxAgeInDays: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    // Delete events older than the cutoff date
    const result = await db
      .delete(events)
      .where(
        and(
          eq(events.read, true),
          gt(cutoffDate, events.createdAt)
        )
      );

    return result.changes || 0;
  } catch (error) {
    console.error("Error cleaning up old events:", error);
    return 0;
  }
}

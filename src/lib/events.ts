import { v4 as uuidv4 } from "uuid";
import { db, events } from "./db";
import { eq, and, gt, lt, inArray } from "drizzle-orm";

/**
 * Publishes an event to a specific channel for a user
 * This replaces Redis pub/sub with SQLite storage
 */
export async function publishEvent({
  userId,
  channel,
  payload,
  deduplicationKey,
}: {
  userId: string;
  channel: string;
  payload: any;
  deduplicationKey?: string; // Optional key to prevent duplicate events
}): Promise<string> {
  try {
    const eventId = uuidv4();
    console.log(`Publishing event to channel ${channel} for user ${userId}`);

    // Check for duplicate events if deduplication key is provided
    if (deduplicationKey) {
      const existingEvent = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.userId, userId),
            eq(events.channel, channel),
            eq(events.read, false)
          )
        )
        .limit(10); // Check recent unread events

      // Check if any existing event has the same deduplication key in payload
      const isDuplicate = existingEvent.some(event => {
        try {
          const eventPayload = JSON.parse(event.payload as string);
          return eventPayload.deduplicationKey === deduplicationKey;
        } catch {
          return false;
        }
      });

      if (isDuplicate) {
        console.log(`Skipping duplicate event with key: ${deduplicationKey}`);
        return eventId; // Return a valid ID but don't create the event
      }
    }

    // Add deduplication key to payload if provided
    const eventPayload = deduplicationKey
      ? { ...payload, deduplicationKey }
      : payload;

    // Insert the event into the SQLite database
    await db.insert(events).values({
      id: eventId,
      userId,
      channel,
      payload: JSON.stringify(eventPayload),
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
 * Removes duplicate events based on deduplication keys
 * This can be called periodically to clean up any duplicates that may have slipped through
 */
export async function removeDuplicateEvents(userId?: string): Promise<{ duplicatesRemoved: number }> {
  try {
    console.log("Removing duplicate events...");

    // Build the base query
    let query = db.select().from(events);
    if (userId) {
      query = query.where(eq(events.userId, userId));
    }

    const allEvents = await query;
    const duplicateIds: string[] = [];
    const seenKeys = new Set<string>();

    // Group events by user and channel, then check for duplicates
    const eventsByUserChannel = new Map<string, typeof allEvents>();

    for (const event of allEvents) {
      const key = `${event.userId}-${event.channel}`;
      if (!eventsByUserChannel.has(key)) {
        eventsByUserChannel.set(key, []);
      }
      eventsByUserChannel.get(key)!.push(event);
    }

    // Check each group for duplicates
    for (const [, events] of eventsByUserChannel) {
      const channelSeenKeys = new Set<string>();

      // Sort by creation time (keep the earliest)
      events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const event of events) {
        try {
          const payload = JSON.parse(event.payload as string);
          if (payload.deduplicationKey) {
            if (channelSeenKeys.has(payload.deduplicationKey)) {
              duplicateIds.push(event.id);
            } else {
              channelSeenKeys.add(payload.deduplicationKey);
            }
          }
        } catch {
          // Skip events with invalid JSON
        }
      }
    }

    // Remove duplicates
    if (duplicateIds.length > 0) {
      console.log(`Removing ${duplicateIds.length} duplicate events`);

      // Delete in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < duplicateIds.length; i += batchSize) {
        const batch = duplicateIds.slice(i, i + batchSize);
        await db.delete(events).where(inArray(events.id, batch));
      }
    }

    console.log(`Removed ${duplicateIds.length} duplicate events`);
    return { duplicatesRemoved: duplicateIds.length };
  } catch (error) {
    console.error("Error removing duplicate events:", error);
    return { duplicatesRemoved: 0 };
  }
}

/**
 * Cleans up old events to prevent the database from growing too large
 * This function is used by the cleanup button in the Activity Log page
 *
 * @param maxAgeInDays Number of days to keep events (default: 7)
 * @param cleanupUnreadAfterDays Number of days after which to clean up unread events (default: 2x maxAgeInDays)
 * @returns Object containing the number of read and unread events deleted
 */
export async function cleanupOldEvents(
  maxAgeInDays: number = 7,
  cleanupUnreadAfterDays?: number
): Promise<{ readEventsDeleted: number; unreadEventsDeleted: number }> {
  try {
    console.log(`Cleaning up events older than ${maxAgeInDays} days...`);

    // Calculate the cutoff date for read events
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    // Delete read events older than the cutoff date
    const readResult = await db
      .delete(events)
      .where(
        and(
          eq(events.read, true),
          lt(events.createdAt, cutoffDate)
        )
      );

    const readEventsDeleted = readResult.changes || 0;
    console.log(`Deleted ${readEventsDeleted} read events`);

    // Calculate the cutoff date for unread events (default to 2x the retention period)
    const unreadCutoffDate = new Date();
    const unreadMaxAge = cleanupUnreadAfterDays || (maxAgeInDays * 2);
    unreadCutoffDate.setDate(unreadCutoffDate.getDate() - unreadMaxAge);

    // Delete unread events that are significantly older
    const unreadResult = await db
      .delete(events)
      .where(
        and(
          eq(events.read, false),
          lt(events.createdAt, unreadCutoffDate)
        )
      );

    const unreadEventsDeleted = unreadResult.changes || 0;
    console.log(`Deleted ${unreadEventsDeleted} unread events`);

    return { readEventsDeleted, unreadEventsDeleted };
  } catch (error) {
    console.error("Error cleaning up old events:", error);
    return { readEventsDeleted: 0, unreadEventsDeleted: 0 };
  }
}

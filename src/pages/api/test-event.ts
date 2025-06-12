import type { APIRoute } from "astro";
import { publishEvent } from "@/lib/events";
import { v4 as uuidv4 } from "uuid";
import { createSecureErrorResponse } from "@/lib/utils";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, message, status } = body;

    if (!userId || !message || !status) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, message, status",
        }),
        { status: 400 }
      );
    }

    // Create a test event
    const eventData = {
      id: uuidv4(),
      userId,
      repositoryId: uuidv4(),
      repositoryName: "test-repo",
      message,
      status,
      timestamp: new Date(),
    };

    // Publish the event
    const channel = `mirror-status:${userId}`;
    await publishEvent({
      userId,
      channel,
      payload: eventData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event published successfully",
        event: eventData,
      }),
      { status: 200 }
    );
  } catch (error) {
    return createSecureErrorResponse(error, "test-event API", 500);
  }
};

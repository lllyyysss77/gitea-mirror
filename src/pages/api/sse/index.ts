import type { APIRoute } from "astro";
import { redisSubscriber } from "@/lib/redis";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const channel = `mirror-status:${userId}`;
  let isClosed = false;
  let connectionAttempts = 0;
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY = 1000; // 1 second

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Function to send a message to the client
      const sendMessage = (message: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error("Stream enqueue error:", err);
        }
      };

      // Function to handle Redis connection and subscription
      const connectToRedis = () => {
        if (isClosed) return;

        try {
          // Set up message handler for Bun's Redis client
          redisSubscriber.onmessage = (message, channelName) => {
            if (isClosed || channelName !== channel) return;
            sendMessage(`data: ${message}\n\n`);
          };

          // Send initial connection message
          sendMessage(": connecting to Redis...\n\n");

          // Use a try-catch block specifically for the subscribe operation
          let subscribed = false;
          try {
            // Bun's Redis client expects a string for the channel
            // We need to wrap this in a try-catch because it can throw if Redis is down
            subscribed = redisSubscriber.subscribe(channel);

            if (subscribed) {
              // If we get here, subscription was successful
              sendMessage(": connected\n\n");

              // Reset connection attempts on successful connection
              connectionAttempts = 0;

              // Send a heartbeat every 30 seconds to keep the connection alive
              const heartbeatInterval = setInterval(() => {
                if (!isClosed) {
                  sendMessage(": heartbeat\n\n");
                } else {
                  clearInterval(heartbeatInterval);
                }
              }, 30000);
            } else {
              throw new Error("Failed to subscribe to Redis channel");
            }

          } catch (subscribeErr) {
            // Handle subscription error
            console.error("Redis subscribe error:", subscribeErr);

            // Retry connection if we haven't exceeded max attempts
            if (connectionAttempts < MAX_ATTEMPTS) {
              connectionAttempts++;
              const nextRetryDelay = RETRY_DELAY * Math.pow(2, connectionAttempts - 1);
              console.log(`Retrying Redis connection (attempt ${connectionAttempts}/${MAX_ATTEMPTS}) in ${nextRetryDelay}ms...`);

              // Send retry message to client
              sendMessage(`: retrying connection (${connectionAttempts}/${MAX_ATTEMPTS}) in ${nextRetryDelay}ms...\n\n`);

              // Wait before retrying
              setTimeout(connectToRedis, nextRetryDelay);
            } else {
              // Max retries exceeded, send error but keep the connection open
              console.error("Max Redis connection attempts exceeded");
              sendMessage(`data: {"error": "Redis connection failed after ${MAX_ATTEMPTS} attempts"}\n\n`);

              // Set up a longer retry after max attempts
              setTimeout(() => {
                connectionAttempts = 0; // Reset counter for a fresh start
                sendMessage(": attempting to reconnect after cooling period...\n\n");
                connectToRedis();
              }, 30000); // Try again after 30 seconds
            }
          }
        } catch (err) {
          // This catches any other errors outside the subscribe operation
          console.error("Redis connection error:", err);
          sendMessage(`data: {"error": "Redis connection error"}\n\n`);

          // Still attempt to retry
          if (connectionAttempts < MAX_ATTEMPTS) {
            connectionAttempts++;
            setTimeout(connectToRedis, RETRY_DELAY * Math.pow(2, connectionAttempts - 1));
          }
        }
      };

      // Start the initial connection
      connectToRedis();

      // Handle client disconnection
      request.signal?.addEventListener("abort", () => {
        if (!isClosed) {
          isClosed = true;
          try {
            redisSubscriber.unsubscribe(channel);
          } catch (err) {
            console.error("Error unsubscribing from Redis:", err);
          }
          controller.close();
        }
      });
    },
    cancel() {
      // Extra safety in case cancel is triggered
      if (!isClosed) {
        isClosed = true;
        try {
          redisSubscriber.unsubscribe(channel);
        } catch (err) {
          console.error("Error unsubscribing from Redis:", err);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

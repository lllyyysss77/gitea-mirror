import { RedisClient } from "bun";

// Connect to Redis using REDIS_URL environment variable or default to redis://redis:6379
// This ensures we have a fallback URL when running with Docker Compose
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

console.log(`Connecting to Redis at: ${redisUrl}`);

// Configure Redis client with connection options and retry logic
function createClient() {
  const client = new RedisClient(redisUrl, {
    autoReconnect: true,
    connectTimeout: 30000, // Increase timeout to 30 seconds
    retryStrategy: (attempt: number) => {
      // Exponential backoff with jitter
      const delay = Math.min(Math.pow(2, attempt) * 100, 10000);
      console.log(`Redis connection attempt ${attempt}, retrying in ${delay}ms`);
      return delay;
    },
  });

  // Set up event handlers
  client.onconnect = () => console.log("Redis client connected successfully");
  client.onclose = (err: Error | null) => {
    if (err) {
      console.error("Redis connection error:", err);
      console.log("Redis will attempt to reconnect automatically");
    } else {
      console.log("Redis connection closed");
    }
  };

  return client;
}

// Create Redis clients with improved error handling
export const redis = createClient();
export const redisPublisher = createClient();
export const redisSubscriber = createClient();

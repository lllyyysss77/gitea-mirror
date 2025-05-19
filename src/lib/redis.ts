import Redis from "ioredis";

// Connect to Redis using REDIS_URL environment variable or default to redis://redis:6379
// This ensures we have a fallback URL when running with Docker Compose
const redisUrl = process.env.REDIS_URL ?? 'redis://redis:6379';

console.log(`Connecting to Redis at: ${redisUrl}`);

// Configure Redis client with connection options
const redisOptions = {
  retryStrategy: (times: number) => {
    // Retry with exponential backoff up to 30 seconds
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis connection attempt ${times} failed. Retrying in ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: 5,
  enableReadyCheck: true,
  connectTimeout: 10000,
};

export const redis = new Redis(redisUrl, redisOptions);
export const redisPublisher = new Redis(redisUrl, redisOptions); // For publishing
export const redisSubscriber = new Redis(redisUrl, redisOptions); // For subscribing

// Log connection events
redis.on('connect', () => console.log('Redis client connected'));
redis.on('error', (err) => console.error('Redis client error:', err));
redis.on('ready', () => console.log('Redis client ready'));
redis.on('reconnecting', () => console.log('Redis client reconnecting...'));

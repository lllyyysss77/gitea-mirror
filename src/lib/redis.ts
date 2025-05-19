import Redis from "ioredis";

// Connect to Redis using REDIS_URL environment variable or default to redis://redis:6379
const redisUrl = process.env.REDIS_URL ?? 'redis://redis:6379';

export const redis = new Redis(redisUrl);
export const redisPublisher = new Redis(redisUrl); // For publishing
export const redisSubscriber = new Redis(redisUrl); // For subscribing

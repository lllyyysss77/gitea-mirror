/**
 * Application configuration
 */

// Environment variables
export const ENV = {
  // Runtime environment (development, production, test)
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database URL - use SQLite by default
  get DATABASE_URL() {
    // If explicitly set, use the provided DATABASE_URL
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // Otherwise, use the default database
    return "sqlite://data/gitea-mirror.db";
  },

  // Better Auth secret for authentication
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET || "your-secret-key-change-this-in-production",

  // Server host and port
  HOST: process.env.HOST || "localhost",
  PORT: parseInt(process.env.PORT || "4321", 10),
};

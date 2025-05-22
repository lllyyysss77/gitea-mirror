import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/utils";
import { db } from "@/lib/db";
import { ENV } from "@/lib/config";
import os from "os";

// Track when the server started
const serverStartTime = new Date();

export const GET: APIRoute = async () => {
  try {
    // Check database connection by running a simple query
    const dbStatus = await checkDatabaseConnection();
    
    // Get system information
    const systemInfo = {
      uptime: getUptime(),
      memory: getMemoryUsage(),
      os: {
        platform: os.platform(),
        version: os.version(),
        arch: os.arch(),
      },
      env: ENV.NODE_ENV,
    };
    
    // Build response
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      database: dbStatus,
      system: systemInfo,
    };
    
    return jsonResponse({
      data: healthData,
      status: 200,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    
    return jsonResponse({
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      status: 503, // Service Unavailable
    });
  }
};

/**
 * Check database connection by running a simple query
 */
async function checkDatabaseConnection() {
  try {
    // Run a simple query to check if the database is accessible
    const result = await db.select({ test: sql`1` }).from(sql`sqlite_master`).limit(1);
    
    return {
      connected: true,
      message: "Database connection successful",
    };
  } catch (error) {
    console.error("Database connection check failed:", error);
    
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Database connection failed",
    };
  }
}

/**
 * Get server uptime information
 */
function getUptime() {
  const now = new Date();
  const uptimeMs = now.getTime() - serverStartTime.getTime();
  
  // Convert to human-readable format
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    startTime: serverStartTime.toISOString(),
    uptimeMs,
    formatted: `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`,
  };
}

/**
 * Get memory usage information
 */
function getMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  
  return {
    rss: formatBytes(memoryUsage.rss),
    heapTotal: formatBytes(memoryUsage.heapTotal),
    heapUsed: formatBytes(memoryUsage.heapUsed),
    external: formatBytes(memoryUsage.external),
    systemTotal: formatBytes(os.totalmem()),
    systemFree: formatBytes(os.freemem()),
  };
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Import sql tag for raw SQL queries
import { sql } from "drizzle-orm";

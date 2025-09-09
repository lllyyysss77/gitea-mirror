import { db, rateLimits } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Octokit } from "@octokit/rest";
import { publishEvent } from "@/lib/events";

type RateLimitStatus = "ok" | "warning" | "limited" | "exceeded";

interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  reset: Date;
  retryAfter?: number;
  status: RateLimitStatus;
}

interface RateLimitHeaders {
  "x-ratelimit-limit"?: string;
  "x-ratelimit-remaining"?: string;
  "x-ratelimit-used"?: string;
  "x-ratelimit-reset"?: string;
  "retry-after"?: string;
}

/**
 * Rate limit manager for GitHub API
 * 
 * GitHub API Limits for authenticated users:
 * - Primary: 5,000 requests per hour
 * - Secondary: 900 points per minute (GET = 1 point, mutations = more)
 * - Concurrent: Maximum 100 concurrent requests (recommended: 5-20)
 * 
 * For repositories with many issues/PRs:
 * - Each issue = 1 request to fetch
 * - Each PR = 1 request to fetch
 * - Comments = Additional requests per issue/PR
 * - Better to limit by total requests rather than repositories
 */
export class RateLimitManager {
  private static readonly WARNING_THRESHOLD = 0.2; // Warn when 20% remaining (80% used)
  private static readonly PAUSE_THRESHOLD = 0.05; // Pause when 5% remaining
  private static readonly MIN_REQUESTS_BUFFER = 100; // Keep at least 100 requests as buffer
  private static lastNotifiedThreshold: Map<string, number> = new Map(); // Track last notification per user

  /**
   * Check current rate limit status from GitHub
   */
  static async checkGitHubRateLimit(octokit: Octokit, userId: string): Promise<RateLimitInfo> {
    try {
      const { data } = await octokit.rateLimit.get();
      const core = data.rate;
      
      const info: RateLimitInfo = {
        limit: core.limit,
        remaining: core.remaining,
        used: core.used,
        reset: new Date(core.reset * 1000),
        status: this.calculateStatus(core.remaining, core.limit),
      };

      // Update database
      await this.updateRateLimit(userId, "github", info);
      
      return info;
    } catch (error) {
      console.error("Failed to check GitHub rate limit:", error);
      // Return last known status from database if API check fails
      return await this.getLastKnownStatus(userId, "github");
    }
  }

  /**
   * Extract rate limit info from response headers
   */
  static parseRateLimitHeaders(headers: RateLimitHeaders): Partial<RateLimitInfo> {
    const info: Partial<RateLimitInfo> = {};
    
    if (headers["x-ratelimit-limit"]) {
      info.limit = parseInt(headers["x-ratelimit-limit"], 10);
    }
    if (headers["x-ratelimit-remaining"]) {
      info.remaining = parseInt(headers["x-ratelimit-remaining"], 10);
    }
    if (headers["x-ratelimit-used"]) {
      info.used = parseInt(headers["x-ratelimit-used"], 10);
    }
    if (headers["x-ratelimit-reset"]) {
      info.reset = new Date(parseInt(headers["x-ratelimit-reset"], 10) * 1000);
    }
    if (headers["retry-after"]) {
      info.retryAfter = parseInt(headers["retry-after"], 10);
    }
    
    if (info.remaining !== undefined && info.limit !== undefined) {
      info.status = this.calculateStatus(info.remaining, info.limit);
    }
    
    return info;
  }

  /**
   * Update rate limit info from API response
   */
  static async updateFromResponse(userId: string, headers: RateLimitHeaders): Promise<void> {
    const info = this.parseRateLimitHeaders(headers);
    if (Object.keys(info).length > 0) {
      await this.updateRateLimit(userId, "github", info as RateLimitInfo);
    }
  }

  /**
   * Calculate rate limit status based on remaining requests
   */
  static calculateStatus(remaining: number, limit: number): RateLimitStatus {
    const ratio = remaining / limit;
    
    if (remaining === 0) return "exceeded";
    if (remaining < this.MIN_REQUESTS_BUFFER || ratio < this.PAUSE_THRESHOLD) return "limited";
    if (ratio < this.WARNING_THRESHOLD) return "warning";
    return "ok";
  }

  /**
   * Check if we should pause operations
   */
  static async shouldPause(userId: string, provider: "github" | "gitea" = "github"): Promise<boolean> {
    const status = await this.getLastKnownStatus(userId, provider);
    return status.status === "limited" || status.status === "exceeded";
  }

  /**
   * Calculate wait time until rate limit resets
   */
  static calculateWaitTime(reset: Date, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000; // Convert to milliseconds
    }
    
    const now = new Date();
    const waitTime = reset.getTime() - now.getTime();
    return Math.max(0, waitTime);
  }

  /**
   * Wait until rate limit resets
   */
  static async waitForReset(userId: string, provider: "github" | "gitea" = "github"): Promise<void> {
    const status = await this.getLastKnownStatus(userId, provider);
    
    if (status.status === "ok" || status.status === "warning") {
      return; // No need to wait
    }
    
    const waitTime = this.calculateWaitTime(status.reset, status.retryAfter);
    
    if (waitTime > 0) {
      console.log(`[RateLimit] Waiting ${Math.ceil(waitTime / 1000)}s for rate limit reset...`);
      
      // Create event for UI notification
      await publishEvent({
        userId,
        channel: "rate-limit",
        payload: {
          type: "waiting",
          provider,
          waitTime,
          resetAt: status.reset,
          message: `API rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds before resuming...`,
        },
      });
      
      // Wait
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Update status after waiting
      await this.updateRateLimit(userId, provider, {
        ...status,
        status: "ok",
        remaining: status.limit,
        used: 0,
      });
      
      // Notify that we've resumed
      await publishEvent({
        userId,
        channel: "rate-limit",
        payload: {
          type: "resumed",
          provider,
          message: "Rate limit reset. Resuming operations...",
        },
      });
    }
  }

  /**
   * Update rate limit info in database
   */
  private static async updateRateLimit(
    userId: string,
    provider: "github" | "gitea",
    info: RateLimitInfo
  ): Promise<void> {
    const existing = await db
      .select()
      .from(rateLimits)
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.provider, provider)))
      .limit(1);
    
    const data = {
      userId,
      provider,
      limit: info.limit,
      remaining: info.remaining,
      used: info.used,
      reset: info.reset,
      retryAfter: info.retryAfter,
      status: info.status,
      lastChecked: new Date(),
      updatedAt: new Date(),
    };
    
    if (existing.length > 0) {
      await db
        .update(rateLimits)
        .set(data)
        .where(eq(rateLimits.id, existing[0].id));
    } else {
      await db.insert(rateLimits).values({
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
      });
    }
    
    // Only send notifications at specific thresholds to avoid spam
    const usedPercentage = ((info.limit - info.remaining) / info.limit) * 100;
    const userKey = `${userId}-${provider}`;
    const lastNotified = this.lastNotifiedThreshold.get(userKey) || 0;
    
    // Notify at 80% usage (20% remaining)
    if (usedPercentage >= 80 && usedPercentage < 100 && lastNotified < 80) {
      this.lastNotifiedThreshold.set(userKey, 80);
      await publishEvent({
        userId,
        channel: "rate-limit",
        payload: {
          type: "warning",
          provider,
          status: info.status,
          remaining: info.remaining,
          limit: info.limit,
          usedPercentage: Math.round(usedPercentage),
          message: `GitHub API rate limit at ${Math.round(usedPercentage)}%. ${info.remaining} requests remaining.`,
        },
      });
      console.log(`[RateLimit] 80% threshold reached for user ${userId}: ${info.remaining}/${info.limit} requests remaining`);
    }
    
    // Notify at 100% usage (0 remaining)
    if (info.remaining === 0 && lastNotified < 100) {
      this.lastNotifiedThreshold.set(userKey, 100);
      const resetTime = new Date(info.reset);
      const minutesUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
      await publishEvent({
        userId,
        channel: "rate-limit",
        payload: {
          type: "exceeded",
          provider,
          status: "exceeded",
          remaining: 0,
          limit: info.limit,
          usedPercentage: 100,
          reset: info.reset,
          message: `GitHub API rate limit exceeded. Will automatically resume in ${minutesUntilReset} minutes.`,
        },
      });
      console.log(`[RateLimit] 100% rate limit exceeded for user ${userId}. Resets at ${resetTime.toLocaleTimeString()}`);
    }
    
    // Reset notification threshold when rate limit resets
    if (info.remaining > info.limit * 0.5 && lastNotified > 0) {
      this.lastNotifiedThreshold.delete(userKey);
    }
  }

  /**
   * Get last known rate limit status from database
   */
  private static async getLastKnownStatus(
    userId: string,
    provider: "github" | "gitea"
  ): Promise<RateLimitInfo> {
    const [result] = await db
      .select()
      .from(rateLimits)
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.provider, provider)))
      .limit(1);
    
    if (result) {
      return {
        limit: result.limit,
        remaining: result.remaining,
        used: result.used,
        reset: result.reset,
        retryAfter: result.retryAfter ?? undefined,
        status: result.status as RateLimitStatus,
      };
    }
    
    // Return default if no data
    return {
      limit: 5000,
      remaining: 5000,
      used: 0,
      reset: new Date(Date.now() + 3600000), // 1 hour from now
      status: "ok",
    };
  }

  /**
   * Get human-readable status message
   */
  private static getStatusMessage(info: RateLimitInfo): string {
    const percentage = Math.round((info.remaining / info.limit) * 100);
    
    switch (info.status) {
      case "exceeded":
        return `API rate limit exceeded. Resets at ${info.reset.toLocaleTimeString()}.`;
      case "limited":
        return `API rate limit critical: Only ${info.remaining} requests remaining (${percentage}%). Pausing operations...`;
      case "warning":
        return `API rate limit warning: ${info.remaining} requests remaining (${percentage}%).`;
      default:
        return `API rate limit healthy: ${info.remaining}/${info.limit} requests remaining.`;
    }
  }

  /**
   * Smart retry with exponential backoff for rate-limited requests
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    userId: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if we should pause before attempting
        if (await this.shouldPause(userId)) {
          await this.waitForReset(userId);
        }
        
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error.status === 403 && error.message?.includes("rate limit")) {
          console.log(`[RateLimit] Rate limit hit on attempt ${attempt + 1}/${maxRetries}`);
          
          // Parse rate limit headers from error response if available
          if (error.response?.headers) {
            await this.updateFromResponse(userId, error.response.headers);
          }
          
          // Wait for reset
          await this.waitForReset(userId);
        } else if (error.status === 429) {
          // Too Many Requests - use exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
          console.log(`[RateLimit] Too many requests, backing off ${backoffTime}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          // Not a rate limit error, throw immediately
          throw error;
        }
      }
    }
    
    throw lastError;
  }
}

/**
 * Middleware to check rate limits before making API calls
 */
export async function withRateLimitCheck<T>(
  userId: string,
  operation: () => Promise<T>,
  operationName: string = "API call"
): Promise<T> {
  // Check if we should pause
  if (await RateLimitManager.shouldPause(userId)) {
    console.log(`[RateLimit] Pausing ${operationName} due to rate limit`);
    await RateLimitManager.waitForReset(userId);
  }
  
  // Execute with retry logic
  return await RateLimitManager.retryWithBackoff(operation, userId);
}

/**
 * Hook to update rate limits from Octokit responses
 */
export function createOctokitRateLimitPlugin(userId: string) {
  return {
    hook: (request: any, options: any) => {
      return request(options).then((response: any) => {
        // Update rate limit from response headers
        if (response.headers) {
          RateLimitManager.updateFromResponse(userId, response.headers).catch(console.error);
        }
        return response;
      });
    },
  };
}
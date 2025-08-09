/**
 * Maps between UI config structure and database schema structure
 */

import type { 
  GitHubConfig, 
  GiteaConfig,
  MirrorOptions, 
  AdvancedOptions,
  SaveConfigApiRequest 
} from "@/types/config";
import { z } from "zod";
import { githubConfigSchema, giteaConfigSchema, scheduleConfigSchema, cleanupConfigSchema } from "@/lib/db/schema";

// Use the actual database schema types
type DbGitHubConfig = z.infer<typeof githubConfigSchema>;
type DbGiteaConfig = z.infer<typeof giteaConfigSchema>;
type DbScheduleConfig = z.infer<typeof scheduleConfigSchema>;
type DbCleanupConfig = z.infer<typeof cleanupConfigSchema>;

/**
 * Maps UI config structure to database schema structure
 */
export function mapUiToDbConfig(
  githubConfig: GitHubConfig,
  giteaConfig: GiteaConfig,
  mirrorOptions: MirrorOptions,
  advancedOptions: AdvancedOptions
): { githubConfig: DbGitHubConfig; giteaConfig: DbGiteaConfig } {
  // Map GitHub config to match database schema fields
  const dbGithubConfig: DbGitHubConfig = {
    // Map username to owner field
    owner: githubConfig.username,
    type: "personal", // Default to personal, could be made configurable
    token: githubConfig.token || "",
    
    // Map checkbox fields with proper names
    includeStarred: githubConfig.mirrorStarred,
    includePrivate: githubConfig.privateRepositories,
    includeForks: !advancedOptions.skipForks, // Note: UI has skipForks, DB has includeForks
    includeArchived: false, // Not in UI yet, default to false
    includePublic: true, // Not in UI yet, default to true
    
    // Organization related fields
    includeOrganizations: [], // Not in UI yet
    
    // Starred repos organization
    starredReposOrg: giteaConfig.starredReposOrg,
    
    // Mirror strategy
    mirrorStrategy: giteaConfig.mirrorStrategy || "preserve",
    defaultOrg: giteaConfig.organization,
    
    // Advanced options
    skipStarredIssues: advancedOptions.skipStarredIssues,
  };

  // Map Gitea config to match database schema
  const dbGiteaConfig: DbGiteaConfig = {
    url: giteaConfig.url,
    token: giteaConfig.token,
    defaultOwner: giteaConfig.username, // Map username to defaultOwner
    
    // Mirror interval and options
    mirrorInterval: "8h", // Default value, could be made configurable
    lfs: false, // Not in UI yet
    wiki: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.wiki,
    
    // Visibility settings
    visibility: giteaConfig.visibility || "default",
    preserveVisibility: giteaConfig.preserveOrgStructure,
    
    // Organization creation
    createOrg: true, // Default to true
    
    // Template settings (not in UI yet)
    templateOwner: undefined,
    templateRepo: undefined,
    
    // Topics
    addTopics: true, // Default to true
    topicPrefix: undefined,
    
    // Fork strategy
    forkStrategy: advancedOptions.skipForks ? "skip" : "reference",
    
    // Mirror options from UI
    mirrorReleases: mirrorOptions.mirrorReleases,
    mirrorMetadata: mirrorOptions.mirrorMetadata,
    mirrorIssues: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.issues,
    mirrorPullRequests: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.pullRequests,
    mirrorLabels: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.labels,
    mirrorMilestones: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.milestones,
  };

  return {
    githubConfig: dbGithubConfig,
    giteaConfig: dbGiteaConfig,
  };
}

/**
 * Maps database schema structure to UI config structure
 */
export function mapDbToUiConfig(dbConfig: any): {
  githubConfig: GitHubConfig;
  giteaConfig: GiteaConfig;
  mirrorOptions: MirrorOptions;
  advancedOptions: AdvancedOptions;
} {
  // Map from database GitHub config to UI fields
  const githubConfig: GitHubConfig = {
    username: dbConfig.githubConfig?.owner || "", // Map owner to username
    token: dbConfig.githubConfig?.token || "",
    privateRepositories: dbConfig.githubConfig?.includePrivate || false, // Map includePrivate to privateRepositories
    mirrorStarred: dbConfig.githubConfig?.includeStarred || false, // Map includeStarred to mirrorStarred
  };

  // Map from database Gitea config to UI fields
  const giteaConfig: GiteaConfig = {
    url: dbConfig.giteaConfig?.url || "",
    username: dbConfig.giteaConfig?.defaultOwner || "", // Map defaultOwner to username
    token: dbConfig.giteaConfig?.token || "",
    organization: dbConfig.githubConfig?.defaultOrg || "github-mirrors", // Get from GitHub config
    visibility: dbConfig.giteaConfig?.visibility === "default" ? "public" : dbConfig.giteaConfig?.visibility || "public",
    starredReposOrg: dbConfig.githubConfig?.starredReposOrg || "starred", // Get from GitHub config
    preserveOrgStructure: dbConfig.giteaConfig?.preserveVisibility || false, // Map preserveVisibility
    mirrorStrategy: dbConfig.githubConfig?.mirrorStrategy || "preserve", // Get from GitHub config
    personalReposOrg: undefined, // Not stored in current schema
  };

  // Map mirror options from various database fields
  const mirrorOptions: MirrorOptions = {
    mirrorReleases: dbConfig.giteaConfig?.mirrorReleases || false,
    mirrorMetadata: dbConfig.giteaConfig?.mirrorMetadata || false,
    metadataComponents: {
      issues: dbConfig.giteaConfig?.mirrorIssues || false,
      pullRequests: dbConfig.giteaConfig?.mirrorPullRequests || false,
      labels: dbConfig.giteaConfig?.mirrorLabels || false,
      milestones: dbConfig.giteaConfig?.mirrorMilestones || false,
      wiki: dbConfig.giteaConfig?.wiki || false,
    },
  };

  // Map advanced options
  const advancedOptions: AdvancedOptions = {
    skipForks: !(dbConfig.githubConfig?.includeForks ?? true), // Invert includeForks to get skipForks
    skipStarredIssues: dbConfig.githubConfig?.skipStarredIssues || false,
  };

  return {
    githubConfig,
    giteaConfig,
    mirrorOptions,
    advancedOptions,
  };
}

/**
 * Maps UI schedule config to database schema
 */
export function mapUiScheduleToDb(uiSchedule: any): DbScheduleConfig {
  return {
    enabled: uiSchedule.enabled || false,
    interval: uiSchedule.interval ? `0 */${Math.floor(uiSchedule.interval / 3600)} * * *` : "0 2 * * *", // Convert seconds to cron expression
    concurrent: false,
    batchSize: 10,
    pauseBetweenBatches: 5000,
    retryAttempts: 3,
    retryDelay: 60000,
    timeout: 3600000,
    autoRetry: true,
    cleanupBeforeMirror: false,
    notifyOnFailure: true,
    notifyOnSuccess: false,
    logLevel: "info",
    timezone: "UTC",
    onlyMirrorUpdated: false,
    updateInterval: 86400000,
    skipRecentlyMirrored: true,
    recentThreshold: 3600000,
  };
}

/**
 * Maps database schedule config to UI format
 */
export function mapDbScheduleToUi(dbSchedule: DbScheduleConfig): any {
  // Extract hours from cron expression if possible
  let intervalSeconds = 3600; // Default 1 hour
  const cronMatch = dbSchedule.interval.match(/0 \*\/(\d+) \* \* \*/);
  if (cronMatch) {
    intervalSeconds = parseInt(cronMatch[1]) * 3600;
  }

  return {
    enabled: dbSchedule.enabled,
    interval: intervalSeconds,
  };
}

/**
 * Maps UI cleanup config to database schema
 */
export function mapUiCleanupToDb(uiCleanup: any): DbCleanupConfig {
  return {
    enabled: uiCleanup.enabled || false,
    retentionDays: uiCleanup.retentionDays || 604800, // Default to 7 days
    deleteFromGitea: false,
    deleteIfNotInGitHub: true,
    protectedRepos: [],
    dryRun: true,
    orphanedRepoAction: "archive",
    batchSize: 10,
    pauseBetweenDeletes: 2000,
  };
}

/**
 * Maps database cleanup config to UI format
 */
export function mapDbCleanupToUi(dbCleanup: DbCleanupConfig): any {
  return {
    enabled: dbCleanup.enabled,
    retentionDays: dbCleanup.retentionDays || 604800, // Use actual value from DB or default to 7 days
  };
}
/**
 * Environment variable configuration loader
 * Loads configuration from environment variables and populates the database
 */

import { db, configs, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { encrypt } from '@/lib/utils/encryption';

interface EnvConfig {
  github: {
    username?: string;
    token?: string;
    privateRepositories?: boolean;
    mirrorStarred?: boolean;
    skipForks?: boolean;
    mirrorOrganizations?: boolean;
    preserveOrgStructure?: boolean;
    onlyMirrorOrgs?: boolean;
    skipStarredIssues?: boolean;
  };
  gitea: {
    url?: string;
    username?: string;
    token?: string;
    organization?: string;
    visibility?: 'public' | 'private' | 'limited';
  };
  mirror: {
    mirrorIssues?: boolean;
    mirrorWiki?: boolean;
    mirrorReleases?: boolean;
    mirrorPullRequests?: boolean;
    mirrorLabels?: boolean;
    mirrorMilestones?: boolean;
  };
  schedule: {
    delay?: number;
    enabled?: boolean;
  };
  cleanup: {
    enabled?: boolean;
    retentionDays?: number;
  };
}

/**
 * Parse environment variables into configuration object
 */
function parseEnvConfig(): EnvConfig {
  return {
    github: {
      username: process.env.GITHUB_USERNAME,
      token: process.env.GITHUB_TOKEN,
      privateRepositories: process.env.PRIVATE_REPOSITORIES === 'true',
      mirrorStarred: process.env.MIRROR_STARRED === 'true',
      skipForks: process.env.SKIP_FORKS === 'true',
      mirrorOrganizations: process.env.MIRROR_ORGANIZATIONS === 'true',
      preserveOrgStructure: process.env.PRESERVE_ORG_STRUCTURE === 'true',
      onlyMirrorOrgs: process.env.ONLY_MIRROR_ORGS === 'true',
      skipStarredIssues: process.env.SKIP_STARRED_ISSUES === 'true',
    },
    gitea: {
      url: process.env.GITEA_URL,
      username: process.env.GITEA_USERNAME,
      token: process.env.GITEA_TOKEN,
      organization: process.env.GITEA_ORGANIZATION,
      visibility: process.env.GITEA_ORG_VISIBILITY as 'public' | 'private' | 'limited',
    },
    mirror: {
      mirrorIssues: process.env.MIRROR_ISSUES === 'true',
      mirrorWiki: process.env.MIRROR_WIKI === 'true',
      mirrorReleases: process.env.MIRROR_RELEASES === 'true',
      mirrorPullRequests: process.env.MIRROR_PULL_REQUESTS === 'true',
      mirrorLabels: process.env.MIRROR_LABELS === 'true',
      mirrorMilestones: process.env.MIRROR_MILESTONES === 'true',
    },
    schedule: {
      delay: process.env.DELAY ? parseInt(process.env.DELAY, 10) : undefined,
      enabled: process.env.SCHEDULE_ENABLED === 'true',
    },
    cleanup: {
      enabled: process.env.CLEANUP_ENABLED === 'true',
      retentionDays: process.env.CLEANUP_RETENTION_DAYS ? parseInt(process.env.CLEANUP_RETENTION_DAYS, 10) : undefined,
    },
  };
}

/**
 * Check if environment configuration is available
 */
function hasEnvConfig(envConfig: EnvConfig): boolean {
  // Check if any GitHub or Gitea config is provided
  return !!(
    envConfig.github.username ||
    envConfig.github.token ||
    envConfig.gitea.url ||
    envConfig.gitea.username ||
    envConfig.gitea.token
  );
}

/**
 * Initialize configuration from environment variables
 * This function runs on application startup and populates the database
 * with configuration from environment variables if available
 */
export async function initializeConfigFromEnv(): Promise<void> {
  try {
    const envConfig = parseEnvConfig();

    // Skip if no environment config is provided
    if (!hasEnvConfig(envConfig)) {
      console.log('[ENV Config Loader] No environment configuration found, skipping initialization');
      return;
    }

    console.log('[ENV Config Loader] Found environment configuration, initializing...');

    // Get the first user (admin user)
    const firstUser = await db
      .select()
      .from(users)
      .limit(1);

    if (firstUser.length === 0) {
      console.log('[ENV Config Loader] No users found, skipping configuration initialization');
      return;
    }

    const userId = firstUser[0].id;

    // Check if config already exists for this user
    const existingConfig = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    // Determine mirror strategy based on environment variables
    let mirrorStrategy: 'preserve' | 'single-org' | 'flat-user' | 'mixed' = 'preserve';
    if (envConfig.github.preserveOrgStructure === false && envConfig.gitea.organization) {
      mirrorStrategy = 'single-org';
    } else if (envConfig.github.preserveOrgStructure === true) {
      mirrorStrategy = 'preserve';
    }

    // Build GitHub config
    const githubConfig = {
      owner: envConfig.github.username || existingConfig?.[0]?.githubConfig?.owner || '',
      type: 'personal' as const,
      token: envConfig.github.token ? encrypt(envConfig.github.token) : existingConfig?.[0]?.githubConfig?.token || '',
      includeStarred: envConfig.github.mirrorStarred ?? existingConfig?.[0]?.githubConfig?.includeStarred ?? false,
      includeForks: !(envConfig.github.skipForks ?? false),
      includeArchived: existingConfig?.[0]?.githubConfig?.includeArchived ?? false,
      includePrivate: envConfig.github.privateRepositories ?? existingConfig?.[0]?.githubConfig?.includePrivate ?? false,
      includePublic: existingConfig?.[0]?.githubConfig?.includePublic ?? true,
      includeOrganizations: envConfig.github.mirrorOrganizations ? [] : (existingConfig?.[0]?.githubConfig?.includeOrganizations ?? []),
      starredReposOrg: 'starred',
      mirrorStrategy,
      defaultOrg: envConfig.gitea.organization || 'github-mirrors',
      skipStarredIssues: envConfig.github.skipStarredIssues ?? existingConfig?.[0]?.githubConfig?.skipStarredIssues ?? false,
    };

    // Build Gitea config
    const giteaConfig = {
      url: envConfig.gitea.url || existingConfig?.[0]?.giteaConfig?.url || '',
      token: envConfig.gitea.token ? encrypt(envConfig.gitea.token) : existingConfig?.[0]?.giteaConfig?.token || '',
      defaultOwner: envConfig.gitea.username || existingConfig?.[0]?.giteaConfig?.defaultOwner || '',
      mirrorInterval: existingConfig?.[0]?.giteaConfig?.mirrorInterval || '8h',
      lfs: existingConfig?.[0]?.giteaConfig?.lfs ?? false,
      wiki: envConfig.mirror.mirrorWiki ?? existingConfig?.[0]?.giteaConfig?.wiki ?? false,
      visibility: envConfig.gitea.visibility || existingConfig?.[0]?.giteaConfig?.visibility || 'public',
      createOrg: true,
      addTopics: existingConfig?.[0]?.giteaConfig?.addTopics ?? true,
      preserveVisibility: existingConfig?.[0]?.giteaConfig?.preserveVisibility ?? false,
      forkStrategy: existingConfig?.[0]?.giteaConfig?.forkStrategy || 'reference',
      mirrorReleases: envConfig.mirror.mirrorReleases ?? existingConfig?.[0]?.giteaConfig?.mirrorReleases ?? false,
      mirrorMetadata: (envConfig.mirror.mirrorIssues || envConfig.mirror.mirrorPullRequests || envConfig.mirror.mirrorLabels || envConfig.mirror.mirrorMilestones) ?? existingConfig?.[0]?.giteaConfig?.mirrorMetadata ?? false,
      mirrorIssues: envConfig.mirror.mirrorIssues ?? existingConfig?.[0]?.giteaConfig?.mirrorIssues ?? false,
      mirrorPullRequests: envConfig.mirror.mirrorPullRequests ?? existingConfig?.[0]?.giteaConfig?.mirrorPullRequests ?? false,
      mirrorLabels: envConfig.mirror.mirrorLabels ?? existingConfig?.[0]?.giteaConfig?.mirrorLabels ?? false,
      mirrorMilestones: envConfig.mirror.mirrorMilestones ?? existingConfig?.[0]?.giteaConfig?.mirrorMilestones ?? false,
    };

    // Build schedule config
    const scheduleConfig = {
      enabled: envConfig.schedule.enabled ?? existingConfig?.[0]?.scheduleConfig?.enabled ?? false,
      interval: envConfig.schedule.delay ? String(envConfig.schedule.delay) : existingConfig?.[0]?.scheduleConfig?.interval || '3600',
      concurrent: existingConfig?.[0]?.scheduleConfig?.concurrent ?? false,
      batchSize: existingConfig?.[0]?.scheduleConfig?.batchSize ?? 10,
      pauseBetweenBatches: existingConfig?.[0]?.scheduleConfig?.pauseBetweenBatches ?? 5000,
      retryAttempts: existingConfig?.[0]?.scheduleConfig?.retryAttempts ?? 3,
      retryDelay: existingConfig?.[0]?.scheduleConfig?.retryDelay ?? 60000,
      timeout: existingConfig?.[0]?.scheduleConfig?.timeout ?? 3600000,
      autoRetry: existingConfig?.[0]?.scheduleConfig?.autoRetry ?? true,
      cleanupBeforeMirror: existingConfig?.[0]?.scheduleConfig?.cleanupBeforeMirror ?? false,
      notifyOnFailure: existingConfig?.[0]?.scheduleConfig?.notifyOnFailure ?? true,
      notifyOnSuccess: existingConfig?.[0]?.scheduleConfig?.notifyOnSuccess ?? false,
      logLevel: existingConfig?.[0]?.scheduleConfig?.logLevel || 'info',
      timezone: existingConfig?.[0]?.scheduleConfig?.timezone || 'UTC',
      onlyMirrorUpdated: existingConfig?.[0]?.scheduleConfig?.onlyMirrorUpdated ?? false,
      updateInterval: existingConfig?.[0]?.scheduleConfig?.updateInterval ?? 86400000,
      skipRecentlyMirrored: existingConfig?.[0]?.scheduleConfig?.skipRecentlyMirrored ?? true,
      recentThreshold: existingConfig?.[0]?.scheduleConfig?.recentThreshold ?? 3600000,
      lastRun: existingConfig?.[0]?.scheduleConfig?.lastRun || null,
      nextRun: existingConfig?.[0]?.scheduleConfig?.nextRun || null,
    };

    // Build cleanup config
    const cleanupConfig = {
      enabled: envConfig.cleanup.enabled ?? existingConfig?.[0]?.cleanupConfig?.enabled ?? false,
      retentionDays: envConfig.cleanup.retentionDays ? envConfig.cleanup.retentionDays * 86400 : existingConfig?.[0]?.cleanupConfig?.retentionDays ?? 604800, // Convert days to seconds
      deleteFromGitea: existingConfig?.[0]?.cleanupConfig?.deleteFromGitea ?? false,
      deleteIfNotInGitHub: existingConfig?.[0]?.cleanupConfig?.deleteIfNotInGitHub ?? true,
      protectedRepos: existingConfig?.[0]?.cleanupConfig?.protectedRepos ?? [],
      dryRun: existingConfig?.[0]?.cleanupConfig?.dryRun ?? true,
      orphanedRepoAction: existingConfig?.[0]?.cleanupConfig?.orphanedRepoAction || 'archive',
      batchSize: existingConfig?.[0]?.cleanupConfig?.batchSize ?? 10,
      pauseBetweenDeletes: existingConfig?.[0]?.cleanupConfig?.pauseBetweenDeletes ?? 2000,
      lastRun: existingConfig?.[0]?.cleanupConfig?.lastRun || null,
      nextRun: existingConfig?.[0]?.cleanupConfig?.nextRun || null,
    };

    if (existingConfig.length > 0) {
      // Update existing config
      console.log('[ENV Config Loader] Updating existing configuration with environment variables');
      await db
        .update(configs)
        .set({
          githubConfig,
          giteaConfig,
          scheduleConfig,
          cleanupConfig,
          updatedAt: new Date(),
        })
        .where(eq(configs.id, existingConfig[0].id));
    } else {
      // Create new config
      console.log('[ENV Config Loader] Creating new configuration from environment variables');
      const configId = uuidv4();
      await db.insert(configs).values({
        id: configId,
        userId,
        name: 'Environment Configuration',
        isActive: true,
        githubConfig,
        giteaConfig,
        include: [],
        exclude: [],
        scheduleConfig,
        cleanupConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('[ENV Config Loader] Configuration initialized successfully from environment variables');
  } catch (error) {
    console.error('[ENV Config Loader] Failed to initialize configuration from environment:', error);
    // Don't throw - this is a non-critical initialization
  }
}
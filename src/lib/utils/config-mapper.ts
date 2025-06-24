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

interface DbGitHubConfig {
  username: string;
  token?: string;
  skipForks: boolean;
  privateRepositories: boolean;
  mirrorIssues: boolean;
  mirrorWiki: boolean;
  mirrorStarred: boolean;
  useSpecificUser: boolean;
  singleRepo?: string;
  includeOrgs: string[];
  excludeOrgs: string[];
  mirrorPublicOrgs: boolean;
  publicOrgs: string[];
  skipStarredIssues: boolean;
}

interface DbGiteaConfig {
  username: string;
  url: string;
  token: string;
  organization?: string;
  visibility: "public" | "private" | "limited";
  starredReposOrg: string;
  preserveOrgStructure: boolean;
  mirrorStrategy?: "preserve" | "single-org" | "flat-user" | "mixed";
  personalReposOrg?: string;
}

/**
 * Maps UI config structure to database schema structure
 */
export function mapUiToDbConfig(
  githubConfig: GitHubConfig,
  giteaConfig: GiteaConfig,
  mirrorOptions: MirrorOptions,
  advancedOptions: AdvancedOptions
): { githubConfig: DbGitHubConfig; giteaConfig: DbGiteaConfig } {
  // Map GitHub config with fields from mirrorOptions and advancedOptions
  const dbGithubConfig: DbGitHubConfig = {
    username: githubConfig.username,
    token: githubConfig.token,
    privateRepositories: githubConfig.privateRepositories,
    mirrorStarred: githubConfig.mirrorStarred,
    
    // From mirrorOptions
    mirrorIssues: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.issues,
    mirrorWiki: mirrorOptions.mirrorMetadata && mirrorOptions.metadataComponents.wiki,
    
    // From advancedOptions
    skipForks: advancedOptions.skipForks,
    skipStarredIssues: advancedOptions.skipStarredIssues,
    
    // Default values for fields not in UI
    useSpecificUser: false,
    includeOrgs: [],
    excludeOrgs: [],
    mirrorPublicOrgs: false,
    publicOrgs: [],
  };

  // Gitea config remains mostly the same
  const dbGiteaConfig: DbGiteaConfig = {
    ...giteaConfig,
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
  const githubConfig: GitHubConfig = {
    username: dbConfig.githubConfig?.username || "",
    token: dbConfig.githubConfig?.token || "",
    privateRepositories: dbConfig.githubConfig?.privateRepositories || false,
    mirrorStarred: dbConfig.githubConfig?.mirrorStarred || false,
  };

  const giteaConfig: GiteaConfig = {
    url: dbConfig.giteaConfig?.url || "",
    username: dbConfig.giteaConfig?.username || "",
    token: dbConfig.giteaConfig?.token || "",
    organization: dbConfig.giteaConfig?.organization || "github-mirrors",
    visibility: dbConfig.giteaConfig?.visibility || "public",
    starredReposOrg: dbConfig.giteaConfig?.starredReposOrg || "github",
    preserveOrgStructure: dbConfig.giteaConfig?.preserveOrgStructure || false,
    mirrorStrategy: dbConfig.giteaConfig?.mirrorStrategy,
    personalReposOrg: dbConfig.giteaConfig?.personalReposOrg,
  };

  const mirrorOptions: MirrorOptions = {
    mirrorReleases: false, // Not stored in DB yet
    mirrorMetadata: dbConfig.githubConfig?.mirrorIssues || dbConfig.githubConfig?.mirrorWiki || false,
    metadataComponents: {
      issues: dbConfig.githubConfig?.mirrorIssues || false,
      pullRequests: false, // Not stored in DB yet
      labels: false, // Not stored in DB yet
      milestones: false, // Not stored in DB yet
      wiki: dbConfig.githubConfig?.mirrorWiki || false,
    },
  };

  const advancedOptions: AdvancedOptions = {
    skipForks: dbConfig.githubConfig?.skipForks || false,
    skipStarredIssues: dbConfig.githubConfig?.skipStarredIssues || false,
  };

  return {
    githubConfig,
    giteaConfig,
    mirrorOptions,
    advancedOptions,
  };
}
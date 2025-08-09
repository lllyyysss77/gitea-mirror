/**
 * Gitea authentication and permission validation utilities
 */

import type { Config } from "@/types/config";
import { httpGet, HttpError } from "./http-client";
import { decryptConfigTokens } from "./utils/config-encryption";

export interface GiteaUser {
  id: number;
  login: string;
  username: string;
  full_name?: string;
  email?: string;
  is_admin: boolean;
  created?: string;
  restricted?: boolean;
  active?: boolean;
  prohibit_login?: boolean;
  location?: string;
  website?: string;
  description?: string;
  visibility?: string;
  followers_count?: number;
  following_count?: number;
  starred_repos_count?: number;
  language?: string;
}

/**
 * Validates Gitea authentication and returns user information
 */
export async function validateGiteaAuth(config: Partial<Config>): Promise<GiteaUser> {
  if (!config.giteaConfig?.url || !config.giteaConfig?.token) {
    throw new Error("Gitea URL and token are required for authentication validation");
  }

  const decryptedConfig = decryptConfigTokens(config as Config);

  try {
    const response = await httpGet<GiteaUser>(
      `${config.giteaConfig.url}/api/v1/user`,
      {
        Authorization: `token ${decryptedConfig.giteaConfig.token}`,
      }
    );

    const user = response.data;
    
    // Validate user data
    if (!user.id || user.id === 0) {
      throw new Error("Invalid user data received from Gitea: User ID is 0 or missing");
    }

    if (!user.username && !user.login) {
      throw new Error("Invalid user data received from Gitea: Username is missing");
    }

    console.log(`[Auth Validator] Successfully authenticated as: ${user.username || user.login} (ID: ${user.id}, Admin: ${user.is_admin})`);
    
    return user;
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) {
        throw new Error(
          "Authentication failed: The provided Gitea token is invalid or expired. " +
          "Please check your Gitea configuration and ensure the token has the necessary permissions."
        );
      } else if (error.status === 403) {
        throw new Error(
          "Permission denied: The Gitea token does not have sufficient permissions. " +
          "Please ensure your token has 'read:user' scope at minimum."
        );
      }
    }
    
    throw new Error(
      `Failed to validate Gitea authentication: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Checks if the authenticated user can create organizations
 */
export async function canCreateOrganizations(config: Partial<Config>): Promise<boolean> {
  try {
    const user = await validateGiteaAuth(config);
    
    // Admin users can always create organizations
    if (user.is_admin) {
      console.log(`[Auth Validator] User is admin, can create organizations`);
      return true;
    }

    // Check if the instance allows regular users to create organizations
    // This would require checking instance settings, which may not be publicly available
    // For now, we'll try to create a test org and see if it fails
    
    if (!config.giteaConfig?.url || !config.giteaConfig?.token) {
      return false;
    }

    const decryptedConfig = decryptConfigTokens(config as Config);

    try {
      // Try to list user's organizations as a proxy for permission check
      const orgsResponse = await httpGet(
        `${config.giteaConfig.url}/api/v1/user/orgs`,
        {
          Authorization: `token ${decryptedConfig.giteaConfig.token}`,
        }
      );
      
      // If we can list orgs, we likely can create them
      console.log(`[Auth Validator] User can list organizations, likely can create them`);
      return true;
    } catch (listError) {
      if (listError instanceof HttpError && listError.status === 403) {
        console.log(`[Auth Validator] User cannot list/create organizations`);
        return false;
      }
      // For other errors, assume we can try
      return true;
    }
  } catch (error) {
    console.error(`[Auth Validator] Error checking organization creation permissions:`, error);
    return false;
  }
}

/**
 * Gets or validates the default owner for repositories
 */
export async function getValidatedDefaultOwner(config: Partial<Config>): Promise<string> {
  const user = await validateGiteaAuth(config);
  const username = user.username || user.login;
  
  if (!username) {
    throw new Error("Unable to determine Gitea username from authentication");
  }

  // Check if the configured defaultOwner matches the authenticated user
  if (config.giteaConfig?.defaultOwner && config.giteaConfig.defaultOwner !== username) {
    console.warn(
      `[Auth Validator] Configured defaultOwner (${config.giteaConfig.defaultOwner}) ` +
      `does not match authenticated user (${username}). Using authenticated user.`
    );
  }

  return username;
}

/**
 * Validates that the Gitea configuration is properly set up for mirroring
 */
export async function validateGiteaConfigForMirroring(config: Partial<Config>): Promise<{
  valid: boolean;
  user: GiteaUser;
  canCreateOrgs: boolean;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  try {
    // Validate authentication
    const user = await validateGiteaAuth(config);
    
    // Check organization creation permissions
    const canCreateOrgs = await canCreateOrganizations(config);
    
    if (!canCreateOrgs && config.giteaConfig?.preserveOrgStructure) {
      warnings.push(
        "User cannot create organizations but 'preserveOrgStructure' is enabled. " +
        "Repositories will be mirrored to the user account instead."
      );
    }
    
    // Validate token scopes (this would require additional API calls to check specific permissions)
    // For now, we'll just check if basic operations work
    
    return {
      valid: true,
      user,
      canCreateOrgs,
      warnings,
      errors,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    
    return {
      valid: false,
      user: {} as GiteaUser,
      canCreateOrgs: false,
      warnings,
      errors,
    };
  }
}
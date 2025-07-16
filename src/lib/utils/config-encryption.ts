import { decrypt } from "./encryption";
import type { Config } from "@/types/config";

/**
 * Decrypts tokens in a config object for use in API calls
 * @param config The config object with potentially encrypted tokens
 * @returns Config object with decrypted tokens
 */
export function decryptConfigTokens(config: Config): Config {
  const decryptedConfig = { ...config };
  
  // Deep clone the config objects
  if (config.githubConfig) {
    decryptedConfig.githubConfig = { ...config.githubConfig };
    if (config.githubConfig.token) {
      decryptedConfig.githubConfig.token = decrypt(config.githubConfig.token);
    }
  }
  
  if (config.giteaConfig) {
    decryptedConfig.giteaConfig = { ...config.giteaConfig };
    if (config.giteaConfig.token) {
      decryptedConfig.giteaConfig.token = decrypt(config.giteaConfig.token);
    }
  }
  
  return decryptedConfig;
}

/**
 * Gets a decrypted GitHub token from config
 * @param config The config object
 * @returns Decrypted GitHub token
 */
export function getDecryptedGitHubToken(config: Config): string {
  if (!config.githubConfig?.token) {
    throw new Error("GitHub token not found in config");
  }
  return decrypt(config.githubConfig.token);
}

/**
 * Gets a decrypted Gitea token from config
 * @param config The config object
 * @returns Decrypted Gitea token
 */
export function getDecryptedGiteaToken(config: Config): string {
  if (!config.giteaConfig?.token) {
    throw new Error("Gitea token not found in config");
  }
  return decrypt(config.giteaConfig.token);
}
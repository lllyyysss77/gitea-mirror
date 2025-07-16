/**
 * Deployment mode utilities
 * For the open source self-hosted version
 */

export const DEPLOYMENT_MODE = 'selfhosted';

export const isSelfHostedMode = () => true;

/**
 * Feature flags for self-hosted version
 */
export const features = {
  // Core features available
  githubSync: true,
  giteaMirroring: true,
  scheduling: true,
  multiUser: true,
  githubSponsors: true,
  unlimitedRepos: true,
};
/**
 * Deployment mode utilities
 * Supports both self-hosted and hosted versions
 */

export const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'selfhosted';

export const isSelfHostedMode = () => DEPLOYMENT_MODE === 'selfhosted';
export const isHostedMode = () => DEPLOYMENT_MODE === 'hosted';

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
/**
 * Recovery mechanism for interrupted jobs
 * This module handles detecting and resuming jobs that were interrupted by container restarts
 */

import { findInterruptedJobs, resumeInterruptedJob } from './helpers';
import { db, repositories, organizations } from './db';
import { eq } from 'drizzle-orm';
import { mirrorGithubRepoToGitea, mirrorGitHubOrgRepoToGiteaOrg, syncGiteaRepo } from './gitea';
import { createGitHubClient } from './github';
import { processWithResilience } from './utils/concurrency';
import { repositoryVisibilityEnum, repoStatusEnum } from '@/types/Repository';
import type { Repository } from './db/schema';

/**
 * Initialize the recovery system
 * This should be called when the application starts
 */
export async function initializeRecovery() {
  console.log('Initializing recovery system...');
  
  try {
    // Find interrupted jobs
    const interruptedJobs = await findInterruptedJobs();
    
    if (interruptedJobs.length === 0) {
      console.log('No interrupted jobs found.');
      return;
    }
    
    console.log(`Found ${interruptedJobs.length} interrupted jobs. Starting recovery...`);
    
    // Process each interrupted job
    for (const job of interruptedJobs) {
      const resumeData = await resumeInterruptedJob(job);
      
      if (!resumeData) {
        console.log(`Job ${job.id} could not be resumed.`);
        continue;
      }
      
      const { job: updatedJob, remainingItemIds } = resumeData;
      
      // Handle different job types
      switch (updatedJob.jobType) {
        case 'mirror':
          await recoverMirrorJob(updatedJob, remainingItemIds);
          break;
        case 'sync':
          await recoverSyncJob(updatedJob, remainingItemIds);
          break;
        case 'retry':
          await recoverRetryJob(updatedJob, remainingItemIds);
          break;
        default:
          console.log(`Unknown job type: ${updatedJob.jobType}`);
      }
    }
    
    console.log('Recovery process completed.');
  } catch (error) {
    console.error('Error during recovery process:', error);
  }
}

/**
 * Recover a mirror job
 */
async function recoverMirrorJob(job: any, remainingItemIds: string[]) {
  console.log(`Recovering mirror job ${job.id} with ${remainingItemIds.length} remaining items`);
  
  try {
    // Get the config for this user
    const [config] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.userId, job.userId))
      .limit(1);
    
    if (!config || !config.configId) {
      throw new Error('Config not found for user');
    }
    
    // Get repositories to process
    const repos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, remainingItemIds));
    
    if (repos.length === 0) {
      throw new Error('No repositories found for the remaining item IDs');
    }
    
    // Create GitHub client
    const octokit = createGitHubClient(config.githubConfig.token);
    
    // Process repositories with resilience
    await processWithResilience(
      repos,
      async (repo) => {
        // Prepare repository data
        const repoData = {
          ...repo,
          status: repoStatusEnum.parse("imported"),
          organization: repo.organization ?? undefined,
          lastMirrored: repo.lastMirrored ?? undefined,
          errorMessage: repo.errorMessage ?? undefined,
          forkedFrom: repo.forkedFrom ?? undefined,
          visibility: repositoryVisibilityEnum.parse(repo.visibility),
          mirroredLocation: repo.mirroredLocation || "",
        };
        
        // Mirror the repository based on whether it's in an organization
        if (repo.organization && config.githubConfig.preserveOrgStructure) {
          await mirrorGitHubOrgRepoToGiteaOrg({
            config,
            octokit,
            orgName: repo.organization,
            repository: repoData,
          });
        } else {
          await mirrorGithubRepoToGitea({
            octokit,
            repository: repoData,
            config,
          });
        }
        
        return repo;
      },
      {
        userId: job.userId,
        jobType: 'mirror',
        getItemId: (repo) => repo.id,
        getItemName: (repo) => repo.name,
        resumeFromJobId: job.id,
        concurrencyLimit: 3,
        maxRetries: 2,
        retryDelay: 2000,
      }
    );
  } catch (error) {
    console.error(`Error recovering mirror job ${job.id}:`, error);
  }
}

/**
 * Recover a sync job
 */
async function recoverSyncJob(job: any, remainingItemIds: string[]) {
  // Implementation similar to recoverMirrorJob but for sync operations
  console.log(`Recovering sync job ${job.id} with ${remainingItemIds.length} remaining items`);
  
  try {
    // Get the config for this user
    const [config] = await db
      .select()
      .from(repositories)
      .where(eq(repositories.userId, job.userId))
      .limit(1);
    
    if (!config || !config.configId) {
      throw new Error('Config not found for user');
    }
    
    // Get repositories to process
    const repos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.id, remainingItemIds));
    
    if (repos.length === 0) {
      throw new Error('No repositories found for the remaining item IDs');
    }
    
    // Process repositories with resilience
    await processWithResilience(
      repos,
      async (repo) => {
        // Prepare repository data
        const repoData = {
          ...repo,
          status: repoStatusEnum.parse(repo.status),
          organization: repo.organization ?? undefined,
          lastMirrored: repo.lastMirrored ?? undefined,
          errorMessage: repo.errorMessage ?? undefined,
          forkedFrom: repo.forkedFrom ?? undefined,
          visibility: repositoryVisibilityEnum.parse(repo.visibility),
        };
        
        // Sync the repository
        await syncGiteaRepo({
          config,
          repository: repoData,
        });
        
        return repo;
      },
      {
        userId: job.userId,
        jobType: 'sync',
        getItemId: (repo) => repo.id,
        getItemName: (repo) => repo.name,
        resumeFromJobId: job.id,
        concurrencyLimit: 5,
        maxRetries: 2,
        retryDelay: 2000,
      }
    );
  } catch (error) {
    console.error(`Error recovering sync job ${job.id}:`, error);
  }
}

/**
 * Recover a retry job
 */
async function recoverRetryJob(job: any, remainingItemIds: string[]) {
  // Implementation similar to recoverMirrorJob but for retry operations
  console.log(`Recovering retry job ${job.id} with ${remainingItemIds.length} remaining items`);
  
  // This would be similar to recoverMirrorJob but with retry-specific logic
  console.log('Retry job recovery not yet implemented');
}

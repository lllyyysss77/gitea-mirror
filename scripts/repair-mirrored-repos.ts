#!/usr/bin/env bun

/**
 * Script to repair repositories that exist in Gitea but have incorrect status in the database
 * This fixes the issue where repositories show as "imported" but are actually mirrored in Gitea
 * 
 * Usage: bun scripts/repair-mirrored-repos.ts [--dry-run] [--repo-name=<name>]
 */

import { db, repositories, configs } from "@/lib/db";
import { eq, and, or } from "drizzle-orm";
import { createMirrorJob } from "@/lib/helpers";
import { repoStatusEnum } from "@/types/Repository";

const isDryRun = process.argv.includes("--dry-run");
const specificRepo = process.argv.find(arg => arg.startsWith("--repo-name="))?.split("=")[1];
const isStartupMode = process.argv.includes("--startup");

async function checkRepoInGitea(config: any, owner: string, repoName: string): Promise<boolean> {
  try {
    if (!config.giteaConfig?.url || !config.giteaConfig?.token) {
      return false;
    }

    const response = await fetch(
      `${config.giteaConfig.url}/api/v1/repos/${owner}/${repoName}`,
      {
        headers: {
          Authorization: `token ${config.giteaConfig.token}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error(`Error checking repo ${owner}/${repoName} in Gitea:`, error);
    return false;
  }
}

async function getRepoDetailsFromGitea(config: any, owner: string, repoName: string): Promise<any> {
  try {
    if (!config.giteaConfig?.url || !config.giteaConfig?.token) {
      return null;
    }

    const response = await fetch(
      `${config.giteaConfig.url}/api/v1/repos/${owner}/${repoName}`,
      {
        headers: {
          Authorization: `token ${config.giteaConfig.token}`,
        },
      }
    );

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error(`Error getting repo details for ${owner}/${repoName}:`, error);
    return null;
  }
}

async function repairMirroredRepositories() {
  if (!isStartupMode) {
    console.log("🔧 Repairing mirrored repositories database status");
    console.log("=" .repeat(60));

    if (isDryRun) {
      console.log("🔍 DRY RUN MODE - No changes will be made");
      console.log("");
    }

    if (specificRepo) {
      console.log(`🎯 Targeting specific repository: ${specificRepo}`);
      console.log("");
    }
  }

  try {
    // Find repositories that might need repair
    let query = db
      .select()
      .from(repositories)
      .where(
        or(
          eq(repositories.status, "imported"),
          eq(repositories.status, "failed")
        )
      );

    if (specificRepo) {
      query = query.where(eq(repositories.name, specificRepo));
    }

    const repos = await query;

    if (repos.length === 0) {
      if (!isStartupMode) {
        console.log("✅ No repositories found that need repair");
      }
      return;
    }

    if (!isStartupMode) {
      console.log(`📋 Found ${repos.length} repositories to check:`);
      console.log("");
    }

    let repairedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const repo of repos) {
      if (!isStartupMode) {
        console.log(`🔍 Checking repository: ${repo.name}`);
        console.log(`   Current status: ${repo.status}`);
        console.log(`   Mirrored location: ${repo.mirroredLocation || "Not set"}`);
      }

      try {
        // Get user configuration
        const config = await db
          .select()
          .from(configs)
          .where(eq(configs.id, repo.configId))
          .limit(1);

        if (config.length === 0) {
          if (!isStartupMode) {
            console.log(`   ❌ No configuration found for repository`);
          }
          errorCount++;
          continue;
        }

        const userConfig = config[0];
        const giteaUsername = userConfig.giteaConfig?.username;

        if (!giteaUsername) {
          if (!isStartupMode) {
            console.log(`   ❌ No Gitea username in configuration`);
          }
          errorCount++;
          continue;
        }

        // Check if repository exists in Gitea (try both user and organization)
        let existsInGitea = false;
        let actualOwner = giteaUsername;
        let giteaRepoDetails = null;

        // First check user location
        existsInGitea = await checkRepoInGitea(userConfig, giteaUsername, repo.name);
        if (existsInGitea) {
          giteaRepoDetails = await getRepoDetailsFromGitea(userConfig, giteaUsername, repo.name);
        }

        // If not found in user location and repo has organization, check organization
        if (!existsInGitea && repo.organization) {
          existsInGitea = await checkRepoInGitea(userConfig, repo.organization, repo.name);
          if (existsInGitea) {
            actualOwner = repo.organization;
            giteaRepoDetails = await getRepoDetailsFromGitea(userConfig, repo.organization, repo.name);
          }
        }

        if (!existsInGitea) {
          if (!isStartupMode) {
            console.log(`   ⏭️  Repository not found in Gitea - skipping`);
          }
          skippedCount++;
          continue;
        }

        if (!isStartupMode) {
          console.log(`   ✅ Repository found in Gitea at: ${actualOwner}/${repo.name}`);

          if (giteaRepoDetails) {
            console.log(`   📊 Gitea details:`);
            console.log(`      Mirror: ${giteaRepoDetails.mirror}`);
            console.log(`      Created: ${new Date(giteaRepoDetails.created_at).toISOString()}`);
            console.log(`      Updated: ${new Date(giteaRepoDetails.updated_at).toISOString()}`);
            if (giteaRepoDetails.mirror_updated) {
              console.log(`      Mirror Updated: ${new Date(giteaRepoDetails.mirror_updated).toISOString()}`);
            }
          }
        } else if (repairedCount === 0) {
          // In startup mode, only log the first repair to indicate activity
          console.log(`Repairing repository status inconsistencies...`);
        }

        if (!isDryRun) {
          // Update repository status in database
          const mirrorUpdated = giteaRepoDetails?.mirror_updated 
            ? new Date(giteaRepoDetails.mirror_updated)
            : new Date();

          await db
            .update(repositories)
            .set({
              status: repoStatusEnum.parse("mirrored"),
              updatedAt: new Date(),
              lastMirrored: mirrorUpdated,
              errorMessage: null,
              mirroredLocation: `${actualOwner}/${repo.name}`,
            })
            .where(eq(repositories.id, repo.id!));

          // Create a mirror job log entry
          await createMirrorJob({
            userId: userConfig.userId || "",
            repositoryId: repo.id,
            repositoryName: repo.name,
            message: `Repository status repaired - found existing mirror in Gitea`,
            details: `Repository ${repo.name} was found to already exist in Gitea at ${actualOwner}/${repo.name} and database status was updated from ${repo.status} to mirrored.`,
            status: "mirrored",
          });

          if (!isStartupMode) {
            console.log(`   🔧 Repaired: Updated status to 'mirrored'`);
          }
        } else {
          if (!isStartupMode) {
            console.log(`   🔧 Would repair: Update status from '${repo.status}' to 'mirrored'`);
          }
        }

        repairedCount++;

      } catch (error) {
        if (!isStartupMode) {
          console.log(`   ❌ Error processing repository: ${error instanceof Error ? error.message : String(error)}`);
        }
        errorCount++;
      }

      if (!isStartupMode) {
        console.log("");
      }
    }

    if (isStartupMode) {
      // In startup mode, only log if there were repairs or errors
      if (repairedCount > 0) {
        console.log(`Repaired ${repairedCount} repository status inconsistencies`);
      }
      if (errorCount > 0) {
        console.log(`Warning: ${errorCount} repositories had errors during repair`);
      }
    } else {
      console.log("📊 Repair Summary:");
      console.log(`   Repaired: ${repairedCount}`);
      console.log(`   Skipped: ${skippedCount}`);
      console.log(`   Errors: ${errorCount}`);

      if (isDryRun && repairedCount > 0) {
        console.log("");
        console.log("💡 To apply these changes, run the script without --dry-run");
      }
    }

  } catch (error) {
    console.error("❌ Error during repair process:", error);
  }
}

// Run the repair
repairMirroredRepositories().then(() => {
  console.log("Repair process complete.");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

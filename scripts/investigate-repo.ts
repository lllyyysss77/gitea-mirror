#!/usr/bin/env bun

/**
 * Script to investigate a specific repository's mirroring status
 * Usage: bun scripts/investigate-repo.ts [repository-name]
 */

import { db, repositories, mirrorJobs, configs } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

const repoName = process.argv[2] || "EruditionPaper";

async function investigateRepository() {
  console.log(`🔍 Investigating repository: ${repoName}`);
  console.log("=" .repeat(50));

  try {
    // Find the repository in the database
    const repos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.name, repoName));

    if (repos.length === 0) {
      console.log(`❌ Repository "${repoName}" not found in database`);
      return;
    }

    const repo = repos[0];
    console.log(`✅ Found repository: ${repo.name}`);
    console.log(`   ID: ${repo.id}`);
    console.log(`   Full Name: ${repo.fullName}`);
    console.log(`   Owner: ${repo.owner}`);
    console.log(`   Organization: ${repo.organization || "None"}`);
    console.log(`   Status: ${repo.status}`);
    console.log(`   Is Private: ${repo.isPrivate}`);
    console.log(`   Is Forked: ${repo.isForked}`);
    console.log(`   Mirrored Location: ${repo.mirroredLocation || "Not set"}`);
    console.log(`   Last Mirrored: ${repo.lastMirrored ? new Date(repo.lastMirrored).toISOString() : "Never"}`);
    console.log(`   Error Message: ${repo.errorMessage || "None"}`);
    console.log(`   Created At: ${new Date(repo.createdAt).toISOString()}`);
    console.log(`   Updated At: ${new Date(repo.updatedAt).toISOString()}`);

    console.log("\n📋 Recent Mirror Jobs:");
    console.log("-".repeat(30));

    // Find recent mirror jobs for this repository
    const jobs = await db
      .select()
      .from(mirrorJobs)
      .where(eq(mirrorJobs.repositoryId, repo.id))
      .orderBy(desc(mirrorJobs.timestamp))
      .limit(10);

    if (jobs.length === 0) {
      console.log("   No mirror jobs found for this repository");
    } else {
      jobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${new Date(job.timestamp).toISOString()}`);
        console.log(`      Status: ${job.status}`);
        console.log(`      Message: ${job.message}`);
        if (job.details) {
          console.log(`      Details: ${job.details}`);
        }
        console.log("");
      });
    }

    // Get user configuration
    console.log("⚙️ User Configuration:");
    console.log("-".repeat(20));

    const config = await db
      .select()
      .from(configs)
      .where(eq(configs.id, repo.configId))
      .limit(1);

    if (config.length > 0) {
      const userConfig = config[0];
      console.log(`   User ID: ${userConfig.userId}`);
      console.log(`   GitHub Username: ${userConfig.githubConfig?.username || "Not set"}`);
      console.log(`   Gitea URL: ${userConfig.giteaConfig?.url || "Not set"}`);
      console.log(`   Gitea Username: ${userConfig.giteaConfig?.username || "Not set"}`);
      console.log(`   Preserve Org Structure: ${userConfig.githubConfig?.preserveOrgStructure || false}`);
      console.log(`   Mirror Issues: ${userConfig.githubConfig?.mirrorIssues || false}`);
    }

    // Check for any active jobs
    console.log("\n🔄 Active Jobs:");
    console.log("-".repeat(15));

    const activeJobs = await db
      .select()
      .from(mirrorJobs)
      .where(
        and(
          eq(mirrorJobs.repositoryId, repo.id),
          eq(mirrorJobs.inProgress, true)
        )
      );

    if (activeJobs.length === 0) {
      console.log("   No active jobs found");
    } else {
      activeJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. Job ID: ${job.id}`);
        console.log(`      Type: ${job.jobType || "mirror"}`);
        console.log(`      Batch ID: ${job.batchId || "None"}`);
        console.log(`      Started: ${job.startedAt ? new Date(job.startedAt).toISOString() : "Unknown"}`);
        console.log(`      Last Checkpoint: ${job.lastCheckpoint ? new Date(job.lastCheckpoint).toISOString() : "None"}`);
        console.log(`      Progress: ${job.completedItems || 0}/${job.totalItems || 0}`);
        console.log("");
      });
    }

    // Check if repository exists in Gitea
    if (config.length > 0) {
      const userConfig = config[0];
      console.log("\n🔗 Gitea Repository Check:");
      console.log("-".repeat(25));

      try {
        const giteaUrl = userConfig.giteaConfig?.url;
        const giteaToken = userConfig.giteaConfig?.token;
        const giteaUsername = userConfig.giteaConfig?.username;

        if (giteaUrl && giteaToken && giteaUsername) {
          const checkUrl = `${giteaUrl}/api/v1/repos/${giteaUsername}/${repo.name}`;
          console.log(`   Checking: ${checkUrl}`);

          const response = await fetch(checkUrl, {
            headers: {
              Authorization: `token ${giteaToken}`,
            },
          });

          console.log(`   Response Status: ${response.status} ${response.statusText}`);

          if (response.ok) {
            const repoData = await response.json();
            console.log(`   ✅ Repository exists in Gitea`);
            console.log(`   Name: ${repoData.name}`);
            console.log(`   Full Name: ${repoData.full_name}`);
            console.log(`   Private: ${repoData.private}`);
            console.log(`   Mirror: ${repoData.mirror}`);
            console.log(`   Clone URL: ${repoData.clone_url}`);
            console.log(`   Created: ${new Date(repoData.created_at).toISOString()}`);
            console.log(`   Updated: ${new Date(repoData.updated_at).toISOString()}`);
            if (repoData.mirror_updated) {
              console.log(`   Mirror Updated: ${new Date(repoData.mirror_updated).toISOString()}`);
            }
          } else {
            console.log(`   ❌ Repository not found in Gitea`);
            const errorText = await response.text();
            console.log(`   Error: ${errorText}`);
          }
        } else {
          console.log("   ⚠️ Missing Gitea configuration");
        }
      } catch (error) {
        console.log(`   ❌ Error checking Gitea: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

  } catch (error) {
    console.error("❌ Error investigating repository:", error);
  }
}

// Run the investigation
investigateRepository().then(() => {
  console.log("Investigation complete.");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

#!/usr/bin/env bun

/**
 * Script to find and clean up duplicate repositories in the database
 * Keeps the most recent entry and removes older duplicates
 * 
 * Usage: bun scripts/cleanup-duplicate-repos.ts [--dry-run] [--repo-name=<name>]
 */

import { db, repositories, mirrorJobs } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

const isDryRun = process.argv.includes("--dry-run");
const specificRepo = process.argv.find(arg => arg.startsWith("--repo-name="))?.split("=")[1];

async function findDuplicateRepositories() {
  console.log("🔍 Finding duplicate repositories");
  console.log("=" .repeat(40));
  
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("");
  }

  if (specificRepo) {
    console.log(`🎯 Targeting specific repository: ${specificRepo}`);
    console.log("");
  }

  try {
    // Find all repositories, grouped by name and fullName
    let allRepos = await db.select().from(repositories);

    if (specificRepo) {
      allRepos = allRepos.filter(repo => repo.name === specificRepo);
    }

    // Group repositories by name and fullName
    const repoGroups = new Map<string, typeof allRepos>();
    
    for (const repo of allRepos) {
      const key = `${repo.name}|${repo.fullName}`;
      if (!repoGroups.has(key)) {
        repoGroups.set(key, []);
      }
      repoGroups.get(key)!.push(repo);
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(repoGroups.entries())
      .filter(([_, repos]) => repos.length > 1);

    if (duplicateGroups.length === 0) {
      console.log("✅ No duplicate repositories found");
      return;
    }

    console.log(`📋 Found ${duplicateGroups.length} sets of duplicate repositories:`);
    console.log("");

    let totalDuplicates = 0;
    let totalRemoved = 0;

    for (const [key, repos] of duplicateGroups) {
      const [name, fullName] = key.split("|");
      console.log(`🔄 Processing duplicates for: ${name} (${fullName})`);
      console.log(`   Found ${repos.length} entries:`);

      // Sort by updatedAt descending to keep the most recent
      repos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const keepRepo = repos[0];
      const removeRepos = repos.slice(1);

      console.log(`   ✅ Keeping: ID ${keepRepo.id} (Status: ${keepRepo.status}, Updated: ${new Date(keepRepo.updatedAt).toISOString()})`);

      for (const repo of removeRepos) {
        console.log(`   ❌ Removing: ID ${repo.id} (Status: ${repo.status}, Updated: ${new Date(repo.updatedAt).toISOString()})`);
        
        if (!isDryRun) {
          try {
            // First, delete related mirror jobs
            await db
              .delete(mirrorJobs)
              .where(eq(mirrorJobs.repositoryId, repo.id!));

            // Then delete the repository
            await db
              .delete(repositories)
              .where(eq(repositories.id, repo.id!));

            console.log(`     🗑️  Deleted repository and related mirror jobs`);
            totalRemoved++;
          } catch (error) {
            console.log(`     ❌ Error deleting repository: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          console.log(`     🗑️  Would delete repository and related mirror jobs`);
          totalRemoved++;
        }
      }

      totalDuplicates += removeRepos.length;
      console.log("");
    }

    console.log("📊 Cleanup Summary:");
    console.log(`   Duplicate sets found: ${duplicateGroups.length}`);
    console.log(`   Total duplicates: ${totalDuplicates}`);
    console.log(`   ${isDryRun ? 'Would remove' : 'Removed'}: ${totalRemoved}`);

    if (isDryRun && totalRemoved > 0) {
      console.log("");
      console.log("💡 To apply these changes, run the script without --dry-run");
    }

  } catch (error) {
    console.error("❌ Error during cleanup process:", error);
  }
}

// Run the cleanup
findDuplicateRepositories().then(() => {
  console.log("Cleanup process complete.");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

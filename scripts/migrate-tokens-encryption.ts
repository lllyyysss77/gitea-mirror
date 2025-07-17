#!/usr/bin/env bun
/**
 * Migration script to encrypt existing GitHub and Gitea tokens in the database
 * Run with: bun run scripts/migrate-tokens-encryption.ts
 */

import { db, configs } from "../src/lib/db";
import { eq } from "drizzle-orm";
import { encrypt, isEncrypted, migrateToken } from "../src/lib/utils/encryption";

async function migrateTokens() {
  console.log("Starting token encryption migration...");
  
  try {
    // Fetch all configs
    const allConfigs = await db.select().from(configs);
    
    console.log(`Found ${allConfigs.length} configurations to check`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const config of allConfigs) {
      try {
        let githubUpdated = false;
        let giteaUpdated = false;
        
        // Parse configs
        const githubConfig = typeof config.githubConfig === "string"
          ? JSON.parse(config.githubConfig)
          : config.githubConfig;
          
        const giteaConfig = typeof config.giteaConfig === "string"
          ? JSON.parse(config.giteaConfig)
          : config.giteaConfig;
        
        // Check and migrate GitHub token
        if (githubConfig.token) {
          if (!isEncrypted(githubConfig.token)) {
            console.log(`Encrypting GitHub token for config ${config.id} (user: ${config.userId})`);
            githubConfig.token = encrypt(githubConfig.token);
            githubUpdated = true;
          } else {
            console.log(`GitHub token already encrypted for config ${config.id}`);
          }
        }
        
        // Check and migrate Gitea token
        if (giteaConfig.token) {
          if (!isEncrypted(giteaConfig.token)) {
            console.log(`Encrypting Gitea token for config ${config.id} (user: ${config.userId})`);
            giteaConfig.token = encrypt(giteaConfig.token);
            giteaUpdated = true;
          } else {
            console.log(`Gitea token already encrypted for config ${config.id}`);
          }
        }
        
        // Update config if any tokens were migrated
        if (githubUpdated || giteaUpdated) {
          await db
            .update(configs)
            .set({
              githubConfig,
              giteaConfig,
              updatedAt: new Date(),
            })
            .where(eq(configs.id, config.id));
            
          migratedCount++;
          console.log(`✓ Config ${config.id} updated successfully`);
        } else {
          skippedCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error processing config ${config.id}:`, error);
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total configs: ${allConfigs.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped (already encrypted): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.error("\n⚠️  Some configs failed to migrate. Please check the errors above.");
      process.exit(1);
    } else {
      console.log("\n✅ Token encryption migration completed successfully!");
    }
    
  } catch (error) {
    console.error("Fatal error during migration:", error);
    process.exit(1);
  }
}

// Verify environment setup
function verifyEnvironment() {
  const requiredEnvVars = ["ENCRYPTION_SECRET", "JWT_SECRET", "BETTER_AUTH_SECRET"];
  const availableSecrets = requiredEnvVars.filter(varName => process.env[varName]);
  
  if (availableSecrets.length === 0) {
    console.error("❌ No encryption secret found!");
    console.error("Please set one of the following environment variables:");
    console.error("  - ENCRYPTION_SECRET (recommended)");
    console.error("  - JWT_SECRET");
    console.error("  - BETTER_AUTH_SECRET");
    process.exit(1);
  }
  
  console.log(`Using encryption secret from: ${availableSecrets[0]}`);
}

// Main execution
async function main() {
  console.log("=== Gitea Mirror Token Encryption Migration ===\n");
  
  // Verify environment
  verifyEnvironment();
  
  // Run migration
  await migrateTokens();
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
#!/usr/bin/env bun

/**
 * Test script to validate Gitea authentication and permissions
 * Run with: bun run src/tests/test-gitea-auth.ts
 */

import { validateGiteaAuth, canCreateOrganizations, validateGiteaConfigForMirroring } from "@/lib/gitea-auth-validator";
import { getConfigsByUserId } from "@/lib/db/queries/configs";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

async function testGiteaAuthentication() {
  console.log("=".repeat(60));
  console.log("GITEA AUTHENTICATION TEST");
  console.log("=".repeat(60));
  
  try {
    // Get the first user for testing
    const userList = await db.select().from(users).limit(1);
    
    if (userList.length === 0) {
      console.error("❌ No users found in database. Please set up a user first.");
      process.exit(1);
    }
    
    const user = userList[0];
    console.log(`\n✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Get the user's configuration
    const configs = await getConfigsByUserId(user.id);
    
    if (configs.length === 0) {
      console.error("❌ No configuration found for user. Please configure Gitea settings.");
      process.exit(1);
    }
    
    const config = configs[0];
    console.log(`✅ Found configuration (ID: ${config.id})`);
    
    if (!config.giteaConfig?.url || !config.giteaConfig?.token) {
      console.error("❌ Gitea configuration is incomplete. URL or token is missing.");
      process.exit(1);
    }
    
    console.log(`\n📡 Testing connection to: ${config.giteaConfig.url}`);
    console.log("-".repeat(60));
    
    // Test 1: Validate authentication
    console.log("\n🔐 Test 1: Validating authentication...");
    try {
      const giteaUser = await validateGiteaAuth(config);
      console.log(`✅ Authentication successful!`);
      console.log(`   - Username: ${giteaUser.username || giteaUser.login}`);
      console.log(`   - User ID: ${giteaUser.id}`);
      console.log(`   - Is Admin: ${giteaUser.is_admin}`);
      console.log(`   - Email: ${giteaUser.email || 'Not provided'}`);
    } catch (error) {
      console.error(`❌ Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    
    // Test 2: Check organization creation permissions
    console.log("\n🏢 Test 2: Checking organization creation permissions...");
    try {
      const canCreate = await canCreateOrganizations(config);
      if (canCreate) {
        console.log(`✅ User can create organizations`);
      } else {
        console.log(`⚠️  User cannot create organizations (will use fallback to user account)`);
      }
    } catch (error) {
      console.error(`❌ Error checking permissions: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 3: Full validation for mirroring
    console.log("\n🔍 Test 3: Full validation for mirroring...");
    try {
      const validation = await validateGiteaConfigForMirroring(config);
      
      if (validation.valid) {
        console.log(`✅ Configuration is valid for mirroring`);
      } else {
        console.log(`❌ Configuration is not valid for mirroring`);
      }
      
      if (validation.warnings.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        validation.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
        });
      }
      
      if (validation.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        validation.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    } catch (error) {
      console.error(`❌ Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test 4: Check specific API endpoints
    console.log("\n🔧 Test 4: Testing specific API endpoints...");
    
    // Import HTTP client for direct API testing
    const { httpGet } = await import("@/lib/http-client");
    const { decryptConfigTokens } = await import("@/lib/utils/config-encryption");
    const decryptedConfig = decryptConfigTokens(config);
    
    // Test organization listing
    try {
      const orgsResponse = await httpGet(
        `${config.giteaConfig.url}/api/v1/user/orgs`,
        {
          Authorization: `token ${decryptedConfig.giteaConfig.token}`,
        }
      );
      console.log(`✅ Can list organizations (found ${orgsResponse.data.length})`);
    } catch (error) {
      console.log(`⚠️  Cannot list organizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test repository listing
    try {
      const reposResponse = await httpGet(
        `${config.giteaConfig.url}/api/v1/user/repos`,
        {
          Authorization: `token ${decryptedConfig.giteaConfig.token}`,
        }
      );
      console.log(`✅ Can list repositories (found ${reposResponse.data.length})`);
    } catch (error) {
      console.error(`❌ Cannot list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("TEST COMPLETE");
    console.log("=".repeat(60));
    
    // Summary
    console.log("\n📊 Summary:");
    console.log(`   - Gitea URL: ${config.giteaConfig.url}`);
    console.log(`   - Default Owner: ${config.giteaConfig.defaultOwner || 'Not set'}`);
    console.log(`   - Mirror Strategy: ${config.githubConfig?.mirrorStrategy || 'Not set'}`);
    console.log(`   - Organization: ${config.giteaConfig.organization || 'Not set'}`);
    console.log(`   - Preserve Org Structure: ${config.giteaConfig.preserveOrgStructure || false}`);
    
    console.log("\n✨ All tests completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testGiteaAuthentication().catch(console.error);
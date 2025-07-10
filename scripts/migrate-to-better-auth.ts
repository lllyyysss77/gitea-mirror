#!/usr/bin/env bun

import { db, users, accounts } from "../src/lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Migrate existing users to Better Auth schema
 * 
 * This script:
 * 1. Moves existing password hashes from users table to accounts table
 * 2. Updates user data to match Better Auth requirements
 * 3. Creates credential accounts for existing users
 */

async function migrateUsers() {
  console.log("🔄 Starting user migration to Better Auth...");

  try {
    // Get all existing users
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      console.log("✅ No users to migrate");
      return;
    }

    console.log(`Found ${existingUsers.length} users to migrate`);

    for (const user of existingUsers) {
      console.log(`\nMigrating user: ${user.username} (${user.email})`);

      // Check if user already has a credential account
      const existingAccount = await db
        .select()
        .from(accounts)
        .where(
          eq(accounts.userId, user.id) && 
          eq(accounts.providerId, "credential")
        )
        .limit(1);

      if (existingAccount.length > 0) {
        console.log("✓ User already migrated");
        continue;
      }

      // Create credential account with existing password hash
      await db.insert(accounts).values({
        id: uuidv4(),
        userId: user.id,
        providerId: "credential",
        providerUserId: user.email, // Use email as provider user ID
        password: user.password, // Move existing password hash
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      console.log("✓ Created credential account");

      // Update user name field if it's null (Better Auth uses 'name' field)
      // Note: Better Auth expects a 'name' field, but we're using username
      // This is handled by our additional fields configuration
    }

    console.log("\n✅ User migration completed successfully!");
    
    // Summary
    const migratedAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.providerId, "credential"));
    
    console.log(`\nMigration Summary:`);
    console.log(`- Total users: ${existingUsers.length}`);
    console.log(`- Migrated accounts: ${migratedAccounts.length}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateUsers();
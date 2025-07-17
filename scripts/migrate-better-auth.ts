#!/usr/bin/env bun
import { db } from "../src/lib/db";
import { users, accounts } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

console.log("🔄 Starting Better Auth migration...");

async function migrateToBetterAuth() {
  try {
    // Check if migration is needed
    const existingAccounts = await db.select().from(accounts).limit(1);
    if (existingAccounts.length > 0) {
      console.log("✓ Better Auth migration already completed");
      return;
    }

    // Get all users with password hashes
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log("ℹ️  No users to migrate");
      return;
    }

    console.log(`📊 Found ${allUsers.length} users to migrate`);

    // Migrate each user
    for (const user of allUsers) {
      try {
        // Skip users without passwords (shouldn't happen but be safe)
        if (!user.password) {
          console.log(`⚠️  Skipping user ${user.email} - no password hash found`);
          continue;
        }

        // Create Better Auth account entry
        await db.insert(accounts).values({
          id: crypto.randomUUID(),
          userId: user.id,
          accountId: user.email, // Use email as account ID
          providerId: "credential", // Better Auth credential provider
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          password: user.password, // Move password hash to accounts table
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Remove password from users table (Better Auth manages it now)
        await db.update(users)
          .set({ password: null })
          .where(eq(users.id, user.id));

        console.log(`✓ Migrated user: ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log("✅ Better Auth migration completed successfully");
    
    // Verify migration
    const migratedAccounts = await db.select().from(accounts);
    console.log(`📊 Total accounts after migration: ${migratedAccounts.length}`);
    
  } catch (error) {
    console.error("❌ Better Auth migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateToBetterAuth();
#!/usr/bin/env bun
import { db } from "../src/lib/db";
import { accounts } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

console.log("🔄 Starting Better Auth migration...");

async function migrateToBetterAuth() {
  try {
    // Check if migration is needed
    const existingAccounts = await db.select().from(accounts).limit(1);
    if (existingAccounts.length > 0) {
      console.log("✓ Better Auth migration already completed");
      return;
    }

    // Check if we have old users table with passwords
    // This query checks if password column exists in users table
    const hasPasswordColumn = await db.get<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM pragma_table_info('users') WHERE name = 'password'`
    );
    
    if (!hasPasswordColumn || hasPasswordColumn.count === 0) {
      console.log("ℹ️  Users table doesn't have password column - migration may have already been done");
      
      // Check if we have any users without accounts
      const usersWithoutAccounts = await db.all<{ id: string; email: string }>(
        sql`SELECT u.id, u.email FROM users u LEFT JOIN accounts a ON u.id = a.user_id WHERE a.id IS NULL`
      );
      
      if (usersWithoutAccounts.length === 0) {
        console.log("✓ All users have accounts - migration complete");
        return;
      }
      
      console.log(`⚠️  Found ${usersWithoutAccounts.length} users without accounts - they may need to reset passwords`);
      return;
    }

    // Get all users with password hashes using raw SQL since the schema doesn't have password
    const allUsersWithPasswords = await db.all<{ id: string; email: string; username: string; password: string }>(
      sql`SELECT id, email, username, password FROM users WHERE password IS NOT NULL`
    );
    
    if (allUsersWithPasswords.length === 0) {
      console.log("ℹ️  No users with passwords to migrate");
      return;
    }

    console.log(`📊 Found ${allUsersWithPasswords.length} users to migrate`);

    // Migrate each user
    for (const user of allUsersWithPasswords) {
      try {
        // Create Better Auth account entry
        await db.insert(accounts).values({
          id: crypto.randomUUID(),
          userId: user.id,
          accountId: user.email, // Use email as account ID
          providerId: "credential", // Better Auth credential provider
          providerUserId: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          password: user.password, // Move password hash to accounts table
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✓ Migrated user: ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
        // Continue with other users even if one fails
      }
    }

    // Remove password column from users table if it exists
    console.log("🔄 Cleaning up old password column...");
    try {
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      // For now, we'll just leave it as is since it's not harmful
      console.log("ℹ️  Password column left in users table for compatibility");
    } catch (error) {
      console.error("⚠️  Could not remove password column:", error);
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
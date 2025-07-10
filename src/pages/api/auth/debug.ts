import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get Better Auth configuration info
    const info = {
      baseURL: auth.options.baseURL,
      basePath: auth.options.basePath,
      trustedOrigins: auth.options.trustedOrigins,
      emailPasswordEnabled: auth.options.emailAndPassword?.enabled,
      userFields: auth.options.user?.additionalFields,
      databaseConfig: {
        usePlural: true,
        provider: "sqlite"
      }
    };
    
    return new Response(JSON.stringify({
      success: true,
      config: info
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Test creating a user directly
    const userId = nanoid();
    const now = new Date();
    
    await db.insert(users).values({
      id: userId,
      email: "test2@example.com",
      emailVerified: false,
      username: "test2",
      // Let the database handle timestamps with defaults
    });
    
    return new Response(JSON.stringify({
      success: true,
      userId,
      message: "User created successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
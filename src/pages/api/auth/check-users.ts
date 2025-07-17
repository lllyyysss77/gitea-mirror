import type { APIRoute } from "astro";
import { db, users } from "@/lib/db";
import { sql } from "drizzle-orm";

export const GET: APIRoute = async () => {
  try {
    const userCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const userCount = userCountResult[0].count;

    if (userCount === 0) {
      return new Response(JSON.stringify({ error: "No users found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ userCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
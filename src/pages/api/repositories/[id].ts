import type { APIRoute } from "astro";
import { db, repositories } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createSecureErrorResponse } from "@/lib/utils";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const PATCH: APIRoute = async ({ request, params, cookies }) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1] || cookies.get("token")?.value;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify token and get user ID
    let userId: string;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const repoId = params.id;
    if (!repoId) {
      return new Response(JSON.stringify({ error: "Repository ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { destinationOrg } = body;

    // Validate that the repository belongs to the user
    const [existingRepo] = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.id, repoId), eq(repositories.userId, userId)))
      .limit(1);

    if (!existingRepo) {
      return new Response(JSON.stringify({ error: "Repository not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update the repository's destination override
    await db
      .update(repositories)
      .set({
        destinationOrg: destinationOrg || null,
        updatedAt: new Date(),
      })
      .where(eq(repositories.id, repoId));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Repository destination updated successfully",
        destinationOrg: destinationOrg || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createSecureErrorResponse(error, "Update repository destination", 500);
  }
};
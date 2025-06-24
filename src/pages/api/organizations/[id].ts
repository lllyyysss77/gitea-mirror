import type { APIRoute } from "astro";
import { db, organizations } from "@/lib/db";
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

    const orgId = params.id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { destinationOrg } = body;

    // Validate that the organization belongs to the user
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), eq(organizations.userId, userId)))
      .limit(1);

    if (!existingOrg) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update the organization's destination override
    await db
      .update(organizations)
      .set({
        destinationOrg: destinationOrg || null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Organization destination updated successfully",
        destinationOrg: destinationOrg || null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return createSecureErrorResponse(error, "Update organization destination", 500);
  }
};

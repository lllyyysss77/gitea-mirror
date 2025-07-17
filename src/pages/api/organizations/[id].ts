import type { APIRoute } from "astro";
import { db, organizations } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { createSecureErrorResponse } from "@/lib/utils";
import { requireAuth } from "@/lib/utils/auth-helpers";

export const PATCH: APIRoute = async (context) => {
  try {
    // Check authentication
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const userId = user!.id;

    const orgId = context.params.id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await context.request.json();
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

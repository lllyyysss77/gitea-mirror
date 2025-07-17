import type { APIContext } from "astro";
import { createSecureErrorResponse } from "@/lib/utils";
import { requireAuth } from "@/lib/utils/auth-helpers";
import { db, oauthApplications } from "@/lib/db";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { generateRandomString } from "@/lib/utils";

// GET /api/sso/applications - List all OAuth applications
export async function GET(context: APIContext) {
  try {
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const applications = await db.select().from(oauthApplications);

    // Don't send client secrets in list response
    const sanitizedApps = applications.map(app => ({
      ...app,
      clientSecret: undefined,
    }));

    return new Response(JSON.stringify(sanitizedApps), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createSecureErrorResponse(error, "SSO applications API");
  }
}

// POST /api/sso/applications - Create a new OAuth application
export async function POST(context: APIContext) {
  try {
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const body = await context.request.json();
    const { name, redirectURLs, type = "web", metadata } = body;

    // Validate required fields
    if (!name || !redirectURLs || redirectURLs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Name and at least one redirect URL are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate client credentials
    const clientId = `client_${generateRandomString(32)}`;
    const clientSecret = `secret_${generateRandomString(48)}`;

    // Insert new application
    const [newApp] = await db
      .insert(oauthApplications)
      .values({
        id: nanoid(),
        clientId,
        clientSecret,
        name,
        redirectURLs: Array.isArray(redirectURLs) ? redirectURLs.join(",") : redirectURLs,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId: user.id,
        disabled: false,
      })
      .returning();

    return new Response(JSON.stringify(newApp), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createSecureErrorResponse(error, "SSO applications API");
  }
}

// PUT /api/sso/applications/:id - Update an OAuth application
export async function PUT(context: APIContext) {
  try {
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const url = new URL(context.request.url);
    const appId = url.pathname.split("/").pop();

    if (!appId) {
      return new Response(
        JSON.stringify({ error: "Application ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await context.request.json();
    const { name, redirectURLs, disabled, metadata } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (redirectURLs !== undefined) {
      updateData.redirectURLs = Array.isArray(redirectURLs) 
        ? redirectURLs.join(",") 
        : redirectURLs;
    }
    if (disabled !== undefined) updateData.disabled = disabled;
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);

    const [updated] = await db
      .update(oauthApplications)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(oauthApplications.id, appId))
      .returning();

    if (!updated) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ...updated, clientSecret: undefined }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createSecureErrorResponse(error, "SSO applications API");
  }
}

// DELETE /api/sso/applications/:id - Delete an OAuth application
export async function DELETE(context: APIContext) {
  try {
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const url = new URL(context.request.url);
    const appId = url.searchParams.get("id");

    if (!appId) {
      return new Response(
        JSON.stringify({ error: "Application ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const deleted = await db
      .delete(oauthApplications)
      .where(eq(oauthApplications.id, appId))
      .returning();

    if (deleted.length === 0) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createSecureErrorResponse(error, "SSO applications API");
  }
}
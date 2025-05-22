import type { APIRoute } from "astro";
import type { MirrorOrgRequest, MirrorOrgResponse } from "@/types/mirror";
import { db, configs, organizations } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { createGitHubClient } from "@/lib/github";
import { mirrorGitHubOrgToGitea } from "@/lib/gitea";
import { repoStatusEnum } from "@/types/Repository";
import { type MembershipRole } from "@/types/organizations";
import { processWithRetry } from "@/lib/utils/concurrency";
import { createMirrorJob } from "@/lib/helpers";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: MirrorOrgRequest = await request.json();
    const { userId, organizationIds } = body;

    if (!userId || !organizationIds || !Array.isArray(organizationIds)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "userId and organizationIds are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (organizationIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No organization IDs provided.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch config
    const configResult = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    const config = configResult[0];

    if (!config || !config.githubConfig.token) {
      return new Response(
        JSON.stringify({ error: "Config missing for the user or token." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch organizations
    const orgs = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, organizationIds));

    if (!orgs.length) {
      return new Response(
        JSON.stringify({ error: "No organizations found for the given IDs." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fire async mirroring without blocking response, using parallel processing
    setTimeout(async () => {
      if (!config.githubConfig.token) {
        throw new Error("GitHub token is missing in config.");
      }

      // Create a single Octokit instance to be reused
      const octokit = createGitHubClient(config.githubConfig.token);

      // Define the concurrency limit - adjust based on API rate limits
      // Using a lower concurrency for organizations since each org might contain many repos
      const CONCURRENCY_LIMIT = 2;

      // Process organizations in parallel with retry capability
      await processWithRetry(
        orgs,
        async (org) => {
          // Prepare organization data
          const orgData = {
            ...org,
            status: repoStatusEnum.parse("imported"),
            membershipRole: org.membershipRole as MembershipRole,
            lastMirrored: org.lastMirrored ?? undefined,
            errorMessage: org.errorMessage ?? undefined,
          };

          // Log the start of mirroring
          console.log(`Starting mirror for organization: ${org.name}`);

          // Create a mirror job entry to track progress
          await createMirrorJob({
            userId: config.userId || "",
            organizationId: org.id,
            organizationName: org.name,
            message: `Started mirroring organization: ${org.name}`,
            details: `Organization ${org.name} is now in the mirroring queue.`,
            status: "mirroring",
          });

          // Mirror the organization
          await mirrorGitHubOrgToGitea({
            config,
            octokit,
            organization: orgData,
          });

          return org;
        },
        {
          concurrencyLimit: CONCURRENCY_LIMIT,
          maxRetries: 2,
          retryDelay: 3000,
          onProgress: (completed, total, result) => {
            const percentComplete = Math.round((completed / total) * 100);
            console.log(`Organization mirroring progress: ${percentComplete}% (${completed}/${total})`);

            if (result) {
              console.log(`Successfully mirrored organization: ${result.name}`);
            }
          },
          onRetry: (org, error, attempt) => {
            console.log(`Retrying organization ${org.name} (attempt ${attempt}): ${error.message}`);
          }
        }
      );

      console.log("All organization mirroring tasks completed");
    }, 0);

    const responsePayload: MirrorOrgResponse = {
      success: true,
      message: "Mirror job started.",
      organizations: orgs.map((org) => ({
        ...org,
        status: repoStatusEnum.parse(org.status),
        membershipRole: org.membershipRole as MembershipRole,
        lastMirrored: org.lastMirrored ?? undefined,
        errorMessage: org.errorMessage ?? undefined,
      })),
    };

    // Immediate response
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mirroring organization:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unknown error occurred.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

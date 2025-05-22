import type { APIRoute } from "astro";
import type { MirrorRepoRequest, MirrorRepoResponse } from "@/types/mirror";
import { db, configs, repositories } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { repositoryVisibilityEnum, repoStatusEnum } from "@/types/Repository";
import {
  mirrorGithubRepoToGitea,
  mirrorGitHubOrgRepoToGiteaOrg,
} from "@/lib/gitea";
import { createGitHubClient } from "@/lib/github";
import { processWithRetry } from "@/lib/utils/concurrency";
import { createMirrorJob } from "@/lib/helpers";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: MirrorRepoRequest = await request.json();
    const { userId, repositoryIds } = body;

    if (!userId || !repositoryIds || !Array.isArray(repositoryIds)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "userId and repositoryIds are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (repositoryIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No repository IDs provided.",
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

    // Fetch repos
    const repos = await db
      .select()
      .from(repositories)
      .where(inArray(repositories.id, repositoryIds));

    if (!repos.length) {
      return new Response(
        JSON.stringify({ error: "No repositories found for the given IDs." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Start async mirroring in background with parallel processing
    setTimeout(async () => {
      if (!config.githubConfig.token) {
        throw new Error("GitHub token is missing.");
      }

      // Create a single Octokit instance to be reused
      const octokit = createGitHubClient(config.githubConfig.token);

      // Define the concurrency limit - adjust based on API rate limits
      const CONCURRENCY_LIMIT = 3;

      // Process repositories in parallel with retry capability
      await processWithRetry(
        repos,
        async (repo) => {
          // Prepare repository data
          const repoData = {
            ...repo,
            status: repoStatusEnum.parse("imported"),
            organization: repo.organization ?? undefined,
            lastMirrored: repo.lastMirrored ?? undefined,
            errorMessage: repo.errorMessage ?? undefined,
            forkedFrom: repo.forkedFrom ?? undefined,
            visibility: repositoryVisibilityEnum.parse(repo.visibility),
            mirroredLocation: repo.mirroredLocation || "",
          };

          // Log the start of mirroring
          console.log(`Starting mirror for repository: ${repo.name}`);

          // Create a mirror job entry to track progress
          await createMirrorJob({
            userId: config.userId || "",
            repositoryId: repo.id,
            repositoryName: repo.name,
            message: `Started mirroring repository: ${repo.name}`,
            details: `Repository ${repo.name} is now in the mirroring queue.`,
            status: "mirroring",
          });

          // Mirror the repository based on whether it's in an organization
          if (repo.organization && config.githubConfig.preserveOrgStructure) {
            await mirrorGitHubOrgRepoToGiteaOrg({
              config,
              octokit,
              orgName: repo.organization,
              repository: repoData,
            });
          } else {
            await mirrorGithubRepoToGitea({
              octokit,
              repository: repoData,
              config,
            });
          }

          return repo;
        },
        {
          concurrencyLimit: CONCURRENCY_LIMIT,
          maxRetries: 2,
          retryDelay: 2000,
          onProgress: (completed, total, result) => {
            const percentComplete = Math.round((completed / total) * 100);
            console.log(`Mirroring progress: ${percentComplete}% (${completed}/${total})`);

            if (result) {
              console.log(`Successfully mirrored repository: ${result.name}`);
            }
          },
          onRetry: (repo, error, attempt) => {
            console.log(`Retrying repository ${repo.name} (attempt ${attempt}): ${error.message}`);
          }
        }
      );

      console.log("All repository mirroring tasks completed");
    }, 0);

    const responsePayload: MirrorRepoResponse = {
      success: true,
      message: "Mirror job started.",
      repositories: repos.map((repo) => ({
        ...repo,
        status: repoStatusEnum.parse(repo.status),
        organization: repo.organization ?? undefined,
        lastMirrored: repo.lastMirrored ?? undefined,
        errorMessage: repo.errorMessage ?? undefined,
        forkedFrom: repo.forkedFrom ?? undefined,
        visibility: repositoryVisibilityEnum.parse(repo.visibility),
        mirroredLocation: repo.mirroredLocation || "",
      })),
    };

    // Return the updated repo list to the user
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error mirroring repositories:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

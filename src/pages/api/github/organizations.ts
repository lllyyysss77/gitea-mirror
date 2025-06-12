import type { APIRoute } from "astro";
import { db } from "@/lib/db";
import { organizations, repositories, configs } from "@/lib/db";
import { eq, sql, and, count } from "drizzle-orm";
import {
  membershipRoleEnum,
  type OrganizationsApiResponse,
} from "@/types/organizations";
import type { Organization } from "@/lib/db/schema";
import { repoStatusEnum } from "@/types/Repository";
import { jsonResponse, createSecureErrorResponse } from "@/lib/utils";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return jsonResponse({
      data: {
        success: false,
        error: "Missing userId",
      },
      status: 400,
    });
  }

  try {
    // Fetch the user's active configuration to respect filtering settings
    const [config] = await db
      .select()
      .from(configs)
      .where(and(eq(configs.userId, userId), eq(configs.isActive, true)));

    if (!config) {
      return jsonResponse({
        data: {
          success: false,
          error: "No active configuration found for this user",
        },
        status: 404,
      });
    }

    const githubConfig = config.githubConfig as {
      mirrorStarred: boolean;
      skipForks: boolean;
      privateRepositories: boolean;
    };

    const rawOrgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.userId, userId))
      .orderBy(sql`name COLLATE NOCASE`);

    // Calculate repository breakdowns for each organization
    const orgsWithBreakdown = await Promise.all(
      rawOrgs.map(async (org) => {
        // Build base conditions for this organization (without private/fork filters)
        const baseConditions = [
          eq(repositories.userId, userId),
          eq(repositories.organization, org.name)
        ];

        if (!githubConfig.mirrorStarred) {
          baseConditions.push(eq(repositories.isStarred, false));
        }

        // Get total count with all user config filters applied
        const totalConditions = [...baseConditions];
        if (githubConfig.skipForks) {
          totalConditions.push(eq(repositories.isForked, false));
        }
        if (!githubConfig.privateRepositories) {
          totalConditions.push(eq(repositories.isPrivate, false));
        }

        const [totalCount] = await db
          .select({ count: count() })
          .from(repositories)
          .where(and(...totalConditions));

        // Get public count
        const publicConditions = [...baseConditions, eq(repositories.isPrivate, false)];
        if (githubConfig.skipForks) {
          publicConditions.push(eq(repositories.isForked, false));
        }

        const [publicCount] = await db
          .select({ count: count() })
          .from(repositories)
          .where(and(...publicConditions));

        // Get private count (only if private repos are enabled in config)
        const [privateCount] = githubConfig.privateRepositories ? await db
          .select({ count: count() })
          .from(repositories)
          .where(
            and(
              ...baseConditions,
              eq(repositories.isPrivate, true),
              ...(githubConfig.skipForks ? [eq(repositories.isForked, false)] : [])
            )
          ) : [{ count: 0 }];

        // Get fork count (only if forks are enabled in config)
        const [forkCount] = !githubConfig.skipForks ? await db
          .select({ count: count() })
          .from(repositories)
          .where(
            and(
              ...baseConditions,
              eq(repositories.isForked, true),
              ...(!githubConfig.privateRepositories ? [eq(repositories.isPrivate, false)] : [])
            )
          ) : [{ count: 0 }];

        return {
          ...org,
          status: repoStatusEnum.parse(org.status),
          membershipRole: membershipRoleEnum.parse(org.membershipRole),
          lastMirrored: org.lastMirrored ?? undefined,
          errorMessage: org.errorMessage ?? undefined,
          repositoryCount: totalCount.count,
          publicRepositoryCount: publicCount.count,
          privateRepositoryCount: privateCount.count,
          forkRepositoryCount: forkCount.count,
        };
      })
    );

    const resPayload: OrganizationsApiResponse = {
      success: true,
      message: "Organizations fetched successfully",
      organizations: orgsWithBreakdown,
    };

    return jsonResponse({ data: resPayload, status: 200 });
  } catch (error) {
    return createSecureErrorResponse(error, "organizations fetch", 500);
  }
};

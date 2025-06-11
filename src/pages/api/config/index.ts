import type { APIRoute } from "astro";
import { db, configs, users } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { calculateCleanupInterval } from "@/lib/cleanup-service";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, githubConfig, giteaConfig, scheduleConfig, cleanupConfig } = body;

    if (!userId || !githubConfig || !giteaConfig || !scheduleConfig || !cleanupConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "userId, githubConfig, giteaConfig, scheduleConfig, and cleanupConfig are required.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch existing config
    const existingConfigResult = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    const existingConfig = existingConfigResult[0];

    // Preserve tokens if fields are empty
    if (existingConfig) {
      try {
        const existingGithub =
          typeof existingConfig.githubConfig === "string"
            ? JSON.parse(existingConfig.githubConfig)
            : existingConfig.githubConfig;

        const existingGitea =
          typeof existingConfig.giteaConfig === "string"
            ? JSON.parse(existingConfig.giteaConfig)
            : existingConfig.giteaConfig;

        if (!githubConfig.token && existingGithub.token) {
          githubConfig.token = existingGithub.token;
        }

        if (!giteaConfig.token && existingGitea.token) {
          giteaConfig.token = existingGitea.token;
        }
      } catch (tokenError) {
        console.error("Failed to preserve tokens:", tokenError);
      }
    }

    // Process schedule config - set/update nextRun if enabled, clear if disabled
    const processedScheduleConfig = { ...scheduleConfig };
    if (scheduleConfig.enabled) {
      const now = new Date();
      const interval = scheduleConfig.interval || 3600; // Default to 1 hour

      // Check if we need to recalculate nextRun
      // Recalculate if: no nextRun exists, or interval changed from existing config
      let shouldRecalculate = !scheduleConfig.nextRun;

      if (existingConfig && existingConfig.scheduleConfig) {
        const existingScheduleConfig = existingConfig.scheduleConfig;
        const existingInterval = existingScheduleConfig.interval || 3600;

        // If interval changed, recalculate nextRun
        if (interval !== existingInterval) {
          shouldRecalculate = true;
        }
      }

      if (shouldRecalculate) {
        processedScheduleConfig.nextRun = new Date(now.getTime() + interval * 1000);
      }
    } else {
      // Clear nextRun when disabled
      processedScheduleConfig.nextRun = null;
    }

    // Process cleanup config - set/update nextRun if enabled, clear if disabled
    const processedCleanupConfig = { ...cleanupConfig };
    if (cleanupConfig.enabled) {
      const now = new Date();
      const retentionSeconds = cleanupConfig.retentionDays || 604800; // Default 7 days in seconds
      const cleanupIntervalHours = calculateCleanupInterval(retentionSeconds);

      // Check if we need to recalculate nextRun
      // Recalculate if: no nextRun exists, or retention period changed from existing config
      let shouldRecalculate = !cleanupConfig.nextRun;

      if (existingConfig && existingConfig.cleanupConfig) {
        const existingCleanupConfig = existingConfig.cleanupConfig;
        const existingRetentionSeconds = existingCleanupConfig.retentionDays || 604800;

        // If retention period changed, recalculate nextRun
        if (retentionSeconds !== existingRetentionSeconds) {
          shouldRecalculate = true;
        }
      }

      if (shouldRecalculate) {
        processedCleanupConfig.nextRun = new Date(now.getTime() + cleanupIntervalHours * 60 * 60 * 1000);
      }
    } else {
      // Clear nextRun when disabled
      processedCleanupConfig.nextRun = null;
    }

    if (existingConfig) {
      // Update path
      await db
        .update(configs)
        .set({
          githubConfig,
          giteaConfig,
          scheduleConfig: processedScheduleConfig,
          cleanupConfig: processedCleanupConfig,
          updatedAt: new Date(),
        })
        .where(eq(configs.id, existingConfig.id));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Configuration updated successfully",
          configId: existingConfig.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fallback user check (optional if you're always passing userId)
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid userId. No matching user found.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create new config
    const configId = uuidv4();
    await db.insert(configs).values({
      id: configId,
      userId,
      name: "Default Configuration",
      isActive: true,
      githubConfig,
      giteaConfig,
      include: [],
      exclude: [],
      scheduleConfig: processedScheduleConfig,
      cleanupConfig: processedCleanupConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Configuration created successfully",
        configId,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error saving configuration:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "Error saving configuration: " +
          (error instanceof Error ? error.message : "Unknown error"),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the configuration for the user
    const config = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, userId))
      .limit(1);

    if (config.length === 0) {
      // Return a default empty configuration instead of a 404 error
      return new Response(
        JSON.stringify({
          id: null,
          userId: userId,
          name: "Default Configuration",
          isActive: true,
          githubConfig: {
            username: "",
            token: "",
            skipForks: false,
            privateRepositories: false,
            mirrorIssues: false,
            mirrorWiki: false,
            mirrorStarred: true,
            useSpecificUser: false,
            preserveOrgStructure: true,
            skipStarredIssues: false,
          },
          giteaConfig: {
            url: "",
            token: "",
            username: "",
            organization: "github-mirrors",
            visibility: "public",
            starredReposOrg: "github",
          },
          scheduleConfig: {
            enabled: false,
            interval: 3600,
            lastRun: null,
            nextRun: null,
          },
          cleanupConfig: {
            enabled: false,
            retentionDays: 604800, // 7 days in seconds
            lastRun: null,
            nextRun: null,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(config[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching configuration:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Something went wrong",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

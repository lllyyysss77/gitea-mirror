import type { RepoStatus } from "@/types/Repository";
import { db, mirrorJobs } from "./db";
import { v4 as uuidv4 } from "uuid";
import { publishEvent } from "./events";

export async function createMirrorJob({
  userId,
  organizationId,
  organizationName,
  repositoryId,
  repositoryName,
  message,
  status,
  details,
}: {
  userId: string;
  organizationId?: string;
  organizationName?: string;
  repositoryId?: string;
  repositoryName?: string;
  details?: string;
  message: string;
  status: RepoStatus;
}) {
  const jobId = uuidv4();
  const currentTimestamp = new Date();

  const job = {
    id: jobId,
    userId,
    repositoryId,
    repositoryName,
    organizationId,
    organizationName,
    configId: uuidv4(),
    details,
    message: message,
    status: status,
    timestamp: currentTimestamp,
  };

  try {
    // Insert the job into the database
    await db.insert(mirrorJobs).values(job);

    // Publish the event using SQLite instead of Redis
    const channel = `mirror-status:${userId}`;
    await publishEvent({
      userId,
      channel,
      payload: job
    });

    return jobId;
  } catch (error) {
    console.error("Error creating mirror job:", error);
    throw new Error("Error creating mirror job");
  }
}

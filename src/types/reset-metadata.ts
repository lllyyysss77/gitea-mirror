import type { Repository } from "@/lib/db/schema";

export interface ResetMetadataRequest {
  userId: string;
  repositoryIds: string[];
}

export interface ResetMetadataResponse {
  success: boolean;
  message?: string;
  error?: string;
  repositories: Repository[];
}

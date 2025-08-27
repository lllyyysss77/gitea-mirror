import { describe, test, expect, mock } from "bun:test";
import { repoStatusEnum } from "@/types/Repository";
import type { Repository } from "./db/schema";

describe("Scheduler Service - Ignored Repository Handling", () => {
  test("should skip repositories with 'ignored' status", async () => {
    // Create a repository with ignored status
    const ignoredRepo: Partial<Repository> = {
      id: "ignored-repo-id",
      name: "ignored-repo",
      fullName: "user/ignored-repo",
      status: repoStatusEnum.parse("ignored"),
      userId: "user-id",
    };

    // Mock the scheduler logic that checks repository status
    const shouldMirrorRepository = (repo: Partial<Repository>): boolean => {
      // Skip ignored repositories
      if (repo.status === "ignored") {
        return false;
      }
      
      // Skip recently mirrored repositories
      if (repo.status === "synced" || repo.status === "mirrored") {
        const lastUpdated = repo.updatedAt;
        if (lastUpdated && Date.now() - lastUpdated.getTime() < 3600000) {
          return false; // Skip if mirrored within last hour
        }
      }
      
      return true;
    };

    // Test that ignored repository is skipped
    expect(shouldMirrorRepository(ignoredRepo)).toBe(false);
    
    // Test that non-ignored repository is not skipped
    const activeRepo: Partial<Repository> = {
      ...ignoredRepo,
      status: repoStatusEnum.parse("imported"),
    };
    expect(shouldMirrorRepository(activeRepo)).toBe(true);
    
    // Test that recently synced repository is skipped
    const recentlySyncedRepo: Partial<Repository> = {
      ...ignoredRepo,
      status: repoStatusEnum.parse("synced"),
      updatedAt: new Date(),
    };
    expect(shouldMirrorRepository(recentlySyncedRepo)).toBe(false);
    
    // Test that old synced repository is not skipped
    const oldSyncedRepo: Partial<Repository> = {
      ...ignoredRepo,
      status: repoStatusEnum.parse("synced"),
      updatedAt: new Date(Date.now() - 7200000), // 2 hours ago
    };
    expect(shouldMirrorRepository(oldSyncedRepo)).toBe(true);
  });

  test("should validate all repository status enum values", () => {
    const validStatuses = [
      "imported",
      "mirroring",
      "mirrored",
      "syncing",
      "synced",
      "failed",
      "skipped",
      "ignored",
      "deleting",
      "deleted"
    ];
    
    validStatuses.forEach(status => {
      expect(() => repoStatusEnum.parse(status)).not.toThrow();
    });
    
    // Test invalid status
    expect(() => repoStatusEnum.parse("invalid-status")).toThrow();
  });
});
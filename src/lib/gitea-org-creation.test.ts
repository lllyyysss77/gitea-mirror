import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { getOrCreateGiteaOrg } from "./gitea";
import type { Config } from "./db/schema";
import { createMirrorJob } from "./helpers";
import { createMockResponse, mockFetch } from "@/tests/mock-fetch";

// Mock the helpers module
mock.module("@/lib/helpers", () => {
  return {
    createMirrorJob: mock(() => Promise.resolve("job-id"))
  };
});

describe("Gitea Organization Creation Error Handling", () => {
  let originalFetch: typeof global.fetch;
  let mockCreateMirrorJob: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    mockCreateMirrorJob = mock(() => Promise.resolve("job-id"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Duplicate organization constraint errors", () => {
    test("should handle PostgreSQL duplicate key constraint violation", async () => {
      global.fetch = mockFetch(async (url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/orgs/starred") && options?.method === "GET") {
          // Organization doesn't exist according to GET
          return createMockResponse(null, {
            ok: false,
            status: 404,
            statusText: "Not Found"
          });
        }
        
        if (url.includes("/api/v1/orgs") && options?.method === "POST") {
          // But creation fails with duplicate key error
          return createMockResponse({
            message: "insert organization: pq: duplicate key value violates unique constraint \"UQE_user_lower_name\"",
            url: "https://gitea.url.com/api/swagger"
          }, {
            ok: false,
            status: 400,
            statusText: "Bad Request"
          });
        }
        
        return createMockResponse(null, { ok: false, status: 404 });
      });

      const config: Partial<Config> = {
        userId: "user-123",
        giteaConfig: {
          url: "https://gitea.url.com",
          token: "gitea-token",
          defaultOwner: "testuser"
        },
        githubConfig: {
          username: "testuser",
          token: "github-token",
          privateRepositories: false,
          mirrorStarred: true
        }
      };

      try {
        await getOrCreateGiteaOrg({
          orgName: "starred",
          config
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("duplicate key value violates unique constraint");
      }
    });

    test("should handle MySQL duplicate entry error", async () => {
      global.fetch = mockFetch(async (url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/orgs/starred") && options?.method === "GET") {
          return createMockResponse(null, {
            ok: false,
            status: 404
          });
        }
        
        if (url.includes("/api/v1/orgs") && options?.method === "POST") {
          return createMockResponse({
            message: "Duplicate entry 'starred' for key 'organizations.username'",
            url: "https://gitea.url.com/api/swagger"
          }, {
            ok: false,
            status: 400,
            statusText: "Bad Request"
          });
        }
        
        return createMockResponse(null, { ok: false, status: 404 });
      });

      const config: Partial<Config> = {
        userId: "user-123",
        giteaConfig: {
          url: "https://gitea.url.com",
          token: "gitea-token",
          defaultOwner: "testuser"
        },
        githubConfig: {
          username: "testuser", 
          token: "github-token",
          privateRepositories: false,
          mirrorStarred: true
        }
      };

      try {
        await getOrCreateGiteaOrg({
          orgName: "starred",
          config
        });
        expect(false).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Duplicate entry");
      }
    });
  });

  describe("Race condition handling", () => {
    test("should handle race condition where org is created between check and create", async () => {
      let checkCount = 0;
      
      global.fetch = mockFetch(async (url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/orgs/starred") && options?.method === "GET") {
          checkCount++;
          
          if (checkCount === 1) {
            // First check: org doesn't exist
            return createMockResponse(null, {
              ok: false,
              status: 404
            });
          } else {
            // Subsequent checks: org exists (created by another process)
            return createMockResponse({
              id: 789,
              username: "starred",
              full_name: "Starred Repositories"
            });
          }
        }
        
        if (url.includes("/api/v1/orgs") && options?.method === "POST") {
          // Creation fails because org was created by another process
          return createMockResponse({
            message: "Organization already exists",
            url: "https://gitea.url.com/api/swagger"
          }, {
            ok: false,
            status: 400,
            statusText: "Bad Request"
          });
        }
        
        return createMockResponse(null, { ok: false, status: 404 });
      });

      const config: Partial<Config> = {
        userId: "user-123",
        giteaConfig: {
          url: "https://gitea.url.com",
          token: "gitea-token",
          defaultOwner: "testuser"
        },
        githubConfig: {
          username: "testuser",
          token: "github-token",
          privateRepositories: false,
          mirrorStarred: true
        }
      };

      // Now we expect this to succeed because it will retry and find the org
      const result = await getOrCreateGiteaOrg({
        orgName: "starred",
        config
      });

      expect(result).toBeDefined();
      expect(result).toBe(789);
    });

    test("should fail after max retries when organization is never found", async () => {
      let checkCount = 0;
      let createAttempts = 0;
      
      global.fetch = mockFetch(async (url: string, options?: RequestInit) => {
        if (url.includes("/api/v1/orgs/starred") && options?.method === "GET") {
          checkCount++;
          
          if (checkCount <= 3) {
            // First three checks: org doesn't exist
            return createMockResponse(null, {
              ok: false,
              status: 404
            });
          } else {
            // Fourth check (would be after third failed creation): org exists
            return createMockResponse({
              id: 999,
              username: "starred",
              full_name: "Starred Repositories"
            });
          }
        }
        
        if (url.includes("/api/v1/orgs") && options?.method === "POST") {
          createAttempts++;
          
          // Always fail creation (simulating race condition)
          return createMockResponse({
            message: "Organization already exists",
            url: "https://gitea.url.com/api/swagger"
          }, {
            ok: false,
            status: 400,
            statusText: "Bad Request"
          });
        }
        
        return createMockResponse(null, { ok: false, status: 404 });
      });

      const config: Partial<Config> = {
        userId: "user-123",
        giteaConfig: {
          url: "https://gitea.url.com",
          token: "gitea-token",
          defaultOwner: "testuser"
        },
        githubConfig: {
          username: "testuser",
          token: "github-token",
          privateRepositories: false,
          mirrorStarred: true
        }
      };

      try {
        await getOrCreateGiteaOrg({
          orgName: "starred",
          config
        });
        // Should not reach here - it will fail after 3 attempts
        expect(true).toBe(false);
      } catch (error) {
        // Should fail after max retries
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Error in getOrCreateGiteaOrg");
        expect((error as Error).message).toContain("Failed to create organization");
        expect(createAttempts).toBe(3); // Should have attempted creation 3 times (once per attempt)
        expect(checkCount).toBe(3); // Should have checked 3 times
      }
    });
  });
});
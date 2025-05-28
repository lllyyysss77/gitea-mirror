import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { Octokit } from "@octokit/rest";
import { repoStatusEnum } from "@/types/Repository";
import { getOrCreateGiteaOrg } from "./gitea";

// Mock the isRepoPresentInGitea function
const mockIsRepoPresentInGitea = mock(() => Promise.resolve(false));

// Mock the database module
mock.module("@/lib/db", () => {
  return {
    db: {
      update: () => ({
        set: () => ({
          where: () => Promise.resolve()
        })
      })
    },
    repositories: {},
    organizations: {}
  };
});

// Mock the helpers module
mock.module("@/lib/helpers", () => {
  return {
    createMirrorJob: mock(() => Promise.resolve("job-id"))
  };
});

// Mock http-client
mock.module("@/lib/http-client", () => {
  return {
    httpPost: mock(() => Promise.resolve({ data: { id: 123 }, status: 200, statusText: 'OK', headers: new Headers() })),
    httpGet: mock(() => Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: new Headers() })),
    HttpError: class MockHttpError extends Error {
      constructor(message: string, public status: number, public statusText: string, public response?: string) {
        super(message);
        this.name = 'HttpError';
      }
    }
  };
});

// Mock the gitea module itself
mock.module("./gitea", () => {
  return {
    isRepoPresentInGitea: mockIsRepoPresentInGitea,
    mirrorGithubRepoToGitea: mock(async () => {}),
    mirrorGitHubOrgRepoToGiteaOrg: mock(async () => {})
  };
});

describe("Gitea Repository Mirroring", () => {
  // Mock console.log and console.error to prevent test output noise
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = mock(() => {});
    console.error = mock(() => {});
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  test("mirrorGithubRepoToGitea handles private repositories correctly", async () => {
    // Import the mocked function
    const { mirrorGithubRepoToGitea } = await import("./gitea");

    // Create mock Octokit instance
    const octokit = {} as Octokit;

    // Create mock repository (private)
    const repository = {
      id: "repo-id",
      name: "test-repo",
      fullName: "testuser/test-repo",
      url: "https://github.com/testuser/test-repo",
      cloneUrl: "https://github.com/testuser/test-repo.git",
      owner: "testuser",
      isPrivate: true,
      status: repoStatusEnum.parse("imported")
    };

    // Create mock config
    const config = {
      id: "config-id",
      userId: "user-id",
      githubConfig: {
        token: "github-token",
        mirrorIssues: false
      },
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "gitea-token",
        username: "giteauser"
      }
    };

    // Call the function
    await mirrorGithubRepoToGitea({
      octokit,
      repository: repository as any,
      config
    });

    // Check that the function was called
    expect(mirrorGithubRepoToGitea).toHaveBeenCalled();
  });

  test("getOrCreateGiteaOrg handles JSON parsing errors gracefully", async () => {
    // Mock fetch to return invalid JSON
    const originalFetch = global.fetch;
    global.fetch = mock(async (url: string) => {
      if (url.includes("/api/v1/orgs/")) {
        // Mock response that looks successful but has invalid JSON
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => name === "content-type" ? "application/json" : null
          },
          json: () => Promise.reject(new Error("Unexpected token in JSON")),
          text: () => Promise.resolve("Invalid JSON response"),
          clone: function() {
            return {
              text: () => Promise.resolve("Invalid JSON response")
            };
          }
        } as any;
      }
      return originalFetch(url);
    });

    const config = {
      userId: "user-id",
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "gitea-token"
      }
    };

    try {
      await getOrCreateGiteaOrg({
        orgName: "test-org",
        config
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should catch the JSON parsing error with a descriptive message
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Failed to parse JSON response from Gitea API");
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });

  test("getOrCreateGiteaOrg handles non-JSON content-type gracefully", async () => {
    // Mock fetch to return HTML instead of JSON
    const originalFetch = global.fetch;
    global.fetch = mock(async (url: string) => {
      if (url.includes("/api/v1/orgs/")) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => name === "content-type" ? "text/html" : null
          },
          text: () => Promise.resolve("<html><body>Error page</body></html>")
        } as any;
      }
      return originalFetch(url);
    });

    const config = {
      userId: "user-id",
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "gitea-token"
      }
    };

    try {
      await getOrCreateGiteaOrg({
        orgName: "test-org",
        config
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should catch the content-type error
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Invalid response format from Gitea API");
      expect((error as Error).message).toContain("text/html");
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  });
});

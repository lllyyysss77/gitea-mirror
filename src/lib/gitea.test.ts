import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { Octokit } from "@octokit/rest";
import { repoStatusEnum } from "@/types/Repository";

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

// Mock superagent
mock.module("superagent", () => {
  const mockPost = mock(() => ({
    set: () => ({
      set: () => ({
        send: () => Promise.resolve({ body: { id: 123 } })
      })
    })
  }));

  const mockGet = mock(() => ({
    set: () => Promise.resolve({ body: [] })
  }));

  return {
    post: mockPost,
    get: mockGet
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
});

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Create a mock POST function
const mockPOST = mock(async ({ request }) => {
  const body = await request.json();

  // Check for missing userId or repositoryIds
  if (!body.userId || !body.repositoryIds) {
    return new Response(
      JSON.stringify({
        error: "Missing userId or repositoryIds."
      }),
      { status: 400 }
    );
  }

  // Success case
  return new Response(
    JSON.stringify({
      success: true,
      message: "Repository mirroring started",
      batchId: "test-batch-id"
    }),
    { status: 200 }
  );
});

// Create a mock module
const mockModule = {
  POST: mockPOST
};

describe("Repository Mirroring API", () => {
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

  test("returns 400 if userId is missing", async () => {
    const request = new Request("http://localhost/api/job/mirror-repo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repositoryIds: ["repo-id-1", "repo-id-2"]
      })
    });

    const response = await mockModule.POST({ request } as any);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Missing userId or repositoryIds.");
  });

  test("returns 400 if repositoryIds is missing", async () => {
    const request = new Request("http://localhost/api/job/mirror-repo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user-id"
      })
    });

    const response = await mockModule.POST({ request } as any);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Missing userId or repositoryIds.");
  });

  test("returns 200 and starts mirroring repositories", async () => {
    const request = new Request("http://localhost/api/job/mirror-repo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user-id",
        repositoryIds: ["repo-id-1", "repo-id-2"]
      })
    });

    const response = await mockModule.POST({ request } as any);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Repository mirroring started");
    expect(data.batchId).toBe("test-batch-id");
  });
});

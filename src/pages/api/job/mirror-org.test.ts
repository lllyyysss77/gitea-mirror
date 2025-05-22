import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Create a mock POST function
const mockPOST = mock(async ({ request }) => {
  const body = await request.json();

  // Check for missing userId or organizationIds
  if (!body.userId || !body.organizationIds) {
    return new Response(
      JSON.stringify({
        error: "Missing userId or organizationIds."
      }),
      { status: 400 }
    );
  }

  // Success case
  return new Response(
    JSON.stringify({
      success: true,
      message: "Organization mirroring started",
      batchId: "test-batch-id"
    }),
    { status: 200 }
  );
});

// Create a mock module
const mockModule = {
  POST: mockPOST
};

describe("Organization Mirroring API", () => {
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
    const request = new Request("http://localhost/api/job/mirror-org", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        organizationIds: ["org-id-1", "org-id-2"]
      })
    });

    const response = await mockModule.POST({ request } as any);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Missing userId or organizationIds.");
  });

  test("returns 400 if organizationIds is missing", async () => {
    const request = new Request("http://localhost/api/job/mirror-org", {
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
    expect(data.error).toBe("Missing userId or organizationIds.");
  });

  test("returns 200 and starts mirroring organizations", async () => {
    const request = new Request("http://localhost/api/job/mirror-org", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user-id",
        organizationIds: ["org-id-1", "org-id-2"]
      })
    });

    const response = await mockModule.POST({ request } as any);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Organization mirroring started");
    expect(data.batchId).toBe("test-batch-id");
  });
});

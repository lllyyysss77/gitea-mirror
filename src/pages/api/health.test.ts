import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { GET } from "./health";
import * as dbModule from "@/lib/db";
import os from "os";

// Mock the database module
mock.module("@/lib/db", () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          limit: () => Promise.resolve([{ test: 1 }])
        })
      })
    }
  };
});

// Mock the os functions individually
const originalPlatform = os.platform;
const originalVersion = os.version;
const originalArch = os.arch;
const originalTotalmem = os.totalmem;
const originalFreemem = os.freemem;

describe("Health API Endpoint", () => {
  beforeEach(() => {
    // Mock os functions
    os.platform = mock(() => "test-platform");
    os.version = mock(() => "test-version");
    os.arch = mock(() => "test-arch");
    os.totalmem = mock(() => 16 * 1024 * 1024 * 1024); // 16GB
    os.freemem = mock(() => 8 * 1024 * 1024 * 1024);   // 8GB

    // Mock process.memoryUsage
    process.memoryUsage = mock(() => ({
      rss: 100 * 1024 * 1024,        // 100MB
      heapTotal: 50 * 1024 * 1024,   // 50MB
      heapUsed: 30 * 1024 * 1024,    // 30MB
      external: 10 * 1024 * 1024,    // 10MB
      arrayBuffers: 5 * 1024 * 1024, // 5MB
    }));

    // Mock process.env
    process.env.npm_package_version = "2.1.0";
  });

  afterEach(() => {
    // Restore original os functions
    os.platform = originalPlatform;
    os.version = originalVersion;
    os.arch = originalArch;
    os.totalmem = originalTotalmem;
    os.freemem = originalFreemem;
  });

  test("returns a successful health check response", async () => {
    const response = await GET({ request: new Request("http://localhost/api/health") } as any);

    expect(response.status).toBe(200);

    const data = await response.json();

    // Check the structure of the response
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBe("2.1.0");

    // Check database status
    expect(data.database.connected).toBe(true);

    // Check system info
    expect(data.system.os.platform).toBe("test-platform");
    expect(data.system.os.version).toBe("test-version");
    expect(data.system.os.arch).toBe("test-arch");

    // Check memory info
    expect(data.system.memory.rss).toBe("100 MB");
    expect(data.system.memory.heapTotal).toBe("50 MB");
    expect(data.system.memory.heapUsed).toBe("30 MB");
    expect(data.system.memory.systemTotal).toBe("16 GB");
    expect(data.system.memory.systemFree).toBe("8 GB");

    // Check uptime
    expect(data.system.uptime.startTime).toBeDefined();
    expect(data.system.uptime.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(data.system.uptime.formatted).toBeDefined();
  });

  test("handles database connection failures", async () => {
    // Mock database failure
    mock.module("@/lib/db", () => {
      return {
        db: {
          select: () => ({
            from: () => ({
              limit: () => Promise.reject(new Error("Database connection error"))
            })
          })
        }
      };
    });

    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    try {
      const response = await GET({ request: new Request("http://localhost/api/health") } as any);

      // Should still return 200 even with DB error, as the service itself is running
      expect(response.status).toBe(200);

      const data = await response.json();

      // Status should still be ok since the service is running
      expect(data.status).toBe("ok");

      // Database should show as disconnected
      expect(data.database.connected).toBe(false);
      expect(data.database.message).toBe("Database connection error");
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
  });

  test("handles database connection failures with status 200", async () => {
    // The health endpoint should return 200 even if the database is down,
    // as the service itself is still running

    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    try {
      const response = await GET({ request: new Request("http://localhost/api/health") } as any);

      // Should return 200 as the service is running
      expect(response.status).toBe(200);

      const data = await response.json();

      // Status should be ok
      expect(data.status).toBe("ok");

      // Database should show as disconnected
      expect(data.database.connected).toBe(false);
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
  });
});

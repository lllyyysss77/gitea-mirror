import { describe, test, expect, mock, beforeAll, afterAll } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";

// Silence console logs during tests
let originalConsoleLog: typeof console.log;

beforeAll(() => {
  // Save original console.log
  originalConsoleLog = console.log;
  // Replace with no-op function
  console.log = () => {};
});

afterAll(() => {
  // Restore original console.log
  console.log = originalConsoleLog;
});

// Mock the database module
mock.module("bun:sqlite", () => {
  return {
    Database: mock(function() {
      return {
        query: mock(() => ({
          all: mock(() => []),
          run: mock(() => ({}))
        }))
      };
    })
  };
});

// Mock the database tables
describe("Database Schema", () => {
  test("database connection can be created", async () => {
    // Import the db from the module
    const { db } = await import("./index");

    // Check that db is defined
    expect(db).toBeDefined();
  });
});

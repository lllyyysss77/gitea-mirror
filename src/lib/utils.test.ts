import { describe, test, expect } from "bun:test";
import { jsonResponse, formatDate, truncate, safeParse } from "./utils";

describe("jsonResponse", () => {
  test("creates a Response with JSON content", () => {
    const data = { message: "Hello, world!" };
    const response = jsonResponse({ data });
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
  
  test("uses the provided status code", () => {
    const data = { error: "Not found" };
    const response = jsonResponse({ data, status: 404 });
    
    expect(response.status).toBe(404);
  });
  
  test("correctly serializes complex objects", async () => {
    const now = new Date();
    const data = { 
      message: "Complex object",
      date: now,
      nested: { foo: "bar" },
      array: [1, 2, 3]
    };
    
    const response = jsonResponse({ data });
    const responseBody = await response.json();
    
    expect(responseBody).toEqual({
      message: "Complex object",
      date: now.toISOString(),
      nested: { foo: "bar" },
      array: [1, 2, 3]
    });
  });
});

describe("formatDate", () => {
  test("formats a date object", () => {
    const date = new Date("2023-01-15T12:30:45Z");
    const formatted = formatDate(date);
    
    // The exact format might depend on the locale, so we'll check for parts
    expect(formatted).toContain("2023");
    expect(formatted).toContain("January");
    expect(formatted).toContain("15");
  });
  
  test("formats a date string", () => {
    const dateStr = "2023-01-15T12:30:45Z";
    const formatted = formatDate(dateStr);
    
    expect(formatted).toContain("2023");
    expect(formatted).toContain("January");
    expect(formatted).toContain("15");
  });
  
  test("returns 'Never' for null or undefined", () => {
    expect(formatDate(null)).toBe("Never");
    expect(formatDate(undefined)).toBe("Never");
  });
});

describe("truncate", () => {
  test("truncates a string that exceeds the length", () => {
    const str = "This is a long string that needs truncation";
    const truncated = truncate(str, 10);
    
    expect(truncated).toBe("This is a ...");
    expect(truncated.length).toBe(13); // 10 chars + "..."
  });
  
  test("does not truncate a string that is shorter than the length", () => {
    const str = "Short";
    const truncated = truncate(str, 10);
    
    expect(truncated).toBe("Short");
  });
  
  test("handles empty strings", () => {
    expect(truncate("", 10)).toBe("");
  });
});

describe("safeParse", () => {
  test("parses valid JSON strings", () => {
    const jsonStr = '{"name":"John","age":30}';
    const parsed = safeParse(jsonStr);
    
    expect(parsed).toEqual({ name: "John", age: 30 });
  });
  
  test("returns undefined for invalid JSON strings", () => {
    const invalidJson = '{"name":"John",age:30}'; // Missing quotes around age
    const parsed = safeParse(invalidJson);
    
    expect(parsed).toBeUndefined();
  });
  
  test("returns the original value for non-string inputs", () => {
    const obj = { name: "John", age: 30 };
    const parsed = safeParse(obj);
    
    expect(parsed).toBe(obj);
  });
});

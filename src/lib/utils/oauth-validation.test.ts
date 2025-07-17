import { describe, test, expect } from "bun:test";
import { isValidRedirectUri, parseRedirectUris } from "./oauth-validation";

describe("OAuth Validation", () => {
  describe("parseRedirectUris", () => {
    test("parses comma-separated URIs", () => {
      const result = parseRedirectUris("https://app1.com,https://app2.com, https://app3.com ");
      expect(result).toEqual([
        "https://app1.com",
        "https://app2.com",
        "https://app3.com"
      ]);
    });

    test("handles empty string", () => {
      expect(parseRedirectUris("")).toEqual([]);
    });

    test("filters out empty values", () => {
      const result = parseRedirectUris("https://app1.com,,https://app2.com,");
      expect(result).toEqual(["https://app1.com", "https://app2.com"]);
    });
  });

  describe("isValidRedirectUri", () => {
    test("validates exact match", () => {
      const authorizedUris = ["https://app.example.com/callback"];
      
      expect(isValidRedirectUri("https://app.example.com/callback", authorizedUris)).toBe(true);
      expect(isValidRedirectUri("https://app.example.com/other", authorizedUris)).toBe(false);
    });

    test("validates wildcard paths", () => {
      const authorizedUris = ["https://app.example.com/*"];
      
      expect(isValidRedirectUri("https://app.example.com/", authorizedUris)).toBe(true);
      expect(isValidRedirectUri("https://app.example.com/callback", authorizedUris)).toBe(true);
      expect(isValidRedirectUri("https://app.example.com/deep/path", authorizedUris)).toBe(true);
      
      // Different domain should fail
      expect(isValidRedirectUri("https://evil.com/callback", authorizedUris)).toBe(false);
    });

    test("validates protocol", () => {
      const authorizedUris = ["https://app.example.com/callback"];
      
      // HTTP instead of HTTPS should fail
      expect(isValidRedirectUri("http://app.example.com/callback", authorizedUris)).toBe(false);
    });

    test("validates host and port", () => {
      const authorizedUris = ["https://app.example.com:3000/callback"];
      
      // Different port should fail
      expect(isValidRedirectUri("https://app.example.com/callback", authorizedUris)).toBe(false);
      expect(isValidRedirectUri("https://app.example.com:3000/callback", authorizedUris)).toBe(true);
      expect(isValidRedirectUri("https://app.example.com:4000/callback", authorizedUris)).toBe(false);
    });

    test("handles invalid URIs", () => {
      const authorizedUris = ["not-a-valid-uri", "https://valid.com"];
      
      // Invalid redirect URI
      expect(isValidRedirectUri("not-a-valid-uri", authorizedUris)).toBe(false);
      
      // Valid redirect URI with invalid authorized URI should still work if it matches valid one
      expect(isValidRedirectUri("https://valid.com", authorizedUris)).toBe(true);
    });

    test("handles empty inputs", () => {
      expect(isValidRedirectUri("", ["https://app.com"])).toBe(false);
      expect(isValidRedirectUri("https://app.com", [])).toBe(false);
    });

    test("prevents open redirect attacks", () => {
      const authorizedUris = ["https://app.example.com/callback"];
      
      // Various attack vectors
      expect(isValidRedirectUri("https://app.example.com.evil.com/callback", authorizedUris)).toBe(false);
      expect(isValidRedirectUri("https://app.example.com@evil.com/callback", authorizedUris)).toBe(false);
      expect(isValidRedirectUri("//evil.com/callback", authorizedUris)).toBe(false);
      expect(isValidRedirectUri("https:evil.com/callback", authorizedUris)).toBe(false);
    });
  });
});
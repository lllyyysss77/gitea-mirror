import { describe, expect, it } from "bun:test";
import {
  looksLikeUrl,
  parseGitHubOwnerReference,
  parseGitHubRepoReference,
} from "./github-url";

describe("parseGitHubRepoReference", () => {
  it("parses the browser URL", () => {
    expect(parseGitHubRepoReference("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("parses clone and SSH remotes, dropping the .git suffix", () => {
    expect(
      parseGitHubRepoReference("https://github.com/vercel/next.js.git")
    ).toEqual({ owner: "vercel", repo: "next.js" });
    expect(
      parseGitHubRepoReference("git@github.com:vercel/next.js.git")
    ).toEqual({ owner: "vercel", repo: "next.js" });
    expect(
      parseGitHubRepoReference("ssh://git@github.com/vercel/next.js.git")
    ).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("ignores everything after the repo in a deep link", () => {
    expect(
      parseGitHubRepoReference(
        "https://github.com/vercel/next.js/tree/canary/packages/next"
      )
    ).toEqual({ owner: "vercel", repo: "next.js" });
    expect(
      parseGitHubRepoReference("https://github.com/vercel/next.js/issues/123")
    ).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("accepts a bare host and the owner/repo shorthand", () => {
    expect(parseGitHubRepoReference("github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
    expect(parseGitHubRepoReference("vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("tolerates wrapping, trailing slashes, and query strings", () => {
    expect(
      parseGitHubRepoReference("  <https://github.com/vercel/next.js/>  ")
    ).toEqual({ owner: "vercel", repo: "next.js" });
    expect(
      parseGitHubRepoReference("https://github.com/vercel/next.js?tab=readme")
    ).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("rejects input that does not name a repository", () => {
    expect(parseGitHubRepoReference("")).toBeNull();
    expect(parseGitHubRepoReference("https://github.com/vercel")).toBeNull();
    expect(parseGitHubRepoReference("https://github.com/orgs/vercel")).toBeNull();
    expect(parseGitHubRepoReference("https://github.com/settings/tokens")).toBeNull();
    expect(parseGitHubRepoReference("not a url at all")).toBeNull();
  });
});

describe("parseGitHubOwnerReference", () => {
  it("parses profile, org, and bare-name forms", () => {
    expect(parseGitHubOwnerReference("https://github.com/microsoft")).toBe(
      "microsoft"
    );
    expect(
      parseGitHubOwnerReference("https://github.com/orgs/microsoft/repositories")
    ).toBe("microsoft");
    expect(parseGitHubOwnerReference("microsoft")).toBe("microsoft");
    expect(parseGitHubOwnerReference("github.com/microsoft/")).toBe("microsoft");
  });

  it("takes the owner from a repository URL", () => {
    expect(parseGitHubOwnerReference("https://github.com/vercel/next.js")).toBe(
      "vercel"
    );
  });

  it("rejects reserved GitHub paths and empty input", () => {
    expect(parseGitHubOwnerReference("https://github.com/settings")).toBeNull();
    expect(parseGitHubOwnerReference("")).toBeNull();
    expect(parseGitHubOwnerReference("   ")).toBeNull();
  });
});

describe("looksLikeUrl", () => {
  it("separates pasted references from plain names", () => {
    expect(looksLikeUrl("https://github.com/vercel/next.js")).toBe(true);
    expect(looksLikeUrl("git@github.com:vercel/next.js.git")).toBe(true);
    expect(looksLikeUrl("vercel/next.js")).toBe(true);
    expect(looksLikeUrl("next.js")).toBe(false);
    expect(looksLikeUrl("microsoft")).toBe(false);
  });
});

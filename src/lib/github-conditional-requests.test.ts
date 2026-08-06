import { describe, expect, test } from "bun:test";
import { Octokit } from "@octokit/rest";
import {
  applyConditionalRequests,
  conditionalRequestCacheKey,
  conditionalRequestTokenScope,
  InMemoryConditionalRequestStore,
} from "@/lib/github-conditional-requests";

function jsonResponse(
  body: unknown,
  init: { status: number; etag?: string; link?: string },
): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (init.etag) headers.etag = init.etag;
  if (init.link) headers.link = init.link;
  return new Response(init.status === 304 ? null : JSON.stringify(body), {
    status: init.status,
    headers,
  });
}

function clientWithFetch(fetch: (url: string, init: any) => Promise<Response>) {
  return new Octokit({
    auth: "test-token",
    request: { fetch: fetch as unknown as typeof globalThis.fetch },
  });
}

describe("applyConditionalRequests", () => {
  test("replays If-None-Match and serves the cached body on 304", async () => {
    const etag = 'W/"abc123"';
    const pulls = [{ number: 1, title: "one" }];
    let calls = 0;
    let secondRequestIfNoneMatch: string | undefined;

    const octokit = clientWithFetch(async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(pulls, { status: 200, etag });
      }
      secondRequestIfNoneMatch = init?.headers?.["if-none-match"];
      return jsonResponse(null, { status: 304, etag });
    });
    applyConditionalRequests(octokit, {
      store: new InMemoryConditionalRequestStore(),
      scope: "user-1",
    });

    const first = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner: "o",
      repo: "r",
      state: "all",
    });
    const second = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner: "o",
      repo: "r",
      state: "all",
    });

    expect(calls).toBe(2);
    expect(secondRequestIfNoneMatch).toBe(etag);
    // A 304 is transparently presented as a 200 carrying the cached body.
    expect(second.status).toBe(200);
    expect(second.data).toEqual(first.data);
    expect(second.data).toEqual(pulls);
  });

  test("does not attach conditional headers to non-GET requests", async () => {
    let sawIfNoneMatch = false;
    const octokit = clientWithFetch(async (_url, init) => {
      if (init?.headers?.["if-none-match"]) sawIfNoneMatch = true;
      return jsonResponse({ ok: true }, { status: 201 });
    });
    applyConditionalRequests(octokit, {
      store: new InMemoryConditionalRequestStore(),
      scope: "user-1",
    });

    await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner: "o",
      repo: "r",
      title: "x",
      head: "a",
      base: "b",
    });

    expect(sawIfNoneMatch).toBe(false);
  });

  test("makes a full request again when the response carries no ETag", async () => {
    let calls = 0;
    let secondRequestIfNoneMatch: string | undefined;
    const octokit = clientWithFetch(async (_url, init) => {
      calls += 1;
      if (calls >= 2) secondRequestIfNoneMatch = init?.headers?.["if-none-match"];
      return jsonResponse([{ number: 1 }], { status: 200 }); // no etag
    });
    applyConditionalRequests(octokit, {
      store: new InMemoryConditionalRequestStore(),
      scope: "user-1",
    });

    await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner: "o",
      repo: "r",
    });
    const second = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner: "o",
      repo: "r",
    });

    expect(calls).toBe(2);
    expect(secondRequestIfNoneMatch).toBeUndefined();
    expect(second.status).toBe(200);
  });

  test("keys cache entries per expanded URL so repos do not collide", async () => {
    // Each resource gets its own ETag; the stub returns 304 only when the
    // presented If-None-Match matches the ETag issued for that exact URL.
    const etagByUrl = new Map<string, string>();
    let notModifiedCount = 0;

    const octokit = clientWithFetch(async (url, init) => {
      const ifNoneMatch = init?.headers?.["if-none-match"] as
        | string
        | undefined;
      let etag = etagByUrl.get(url);
      if (!etag) {
        etag = `W/"etag-${etagByUrl.size + 1}"`;
        etagByUrl.set(url, etag);
      }
      if (ifNoneMatch && ifNoneMatch === etag) {
        notModifiedCount += 1;
        return jsonResponse(null, { status: 304, etag });
      }
      return jsonResponse([{ url }], { status: 200, etag });
    });
    applyConditionalRequests(octokit, {
      store: new InMemoryConditionalRequestStore(),
      scope: "user-1",
    });

    const get = (owner: string, repo: string) =>
      octokit.request("GET /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        state: "all",
      });

    const first = await get("alpha", "one");
    await get("beta", "two");
    const third = await get("alpha", "one");

    // The repeated first request must revalidate against its OWN ETag and come
    // back as a 304 cache hit, not be clobbered by the second repo's entry.
    expect(notModifiedCount).toBe(1);
    expect(third.status).toBe(200);
    expect(third.data).toEqual(first.data);
  });

  test("isolates cached entries by scope", () => {
    const store = new InMemoryConditionalRequestStore();
    store.set(conditionalRequestCacheKey("user-1", "GET", "/x"), {
      etag: "a",
      data: 1,
      status: 200,
    });
    expect(
      store.get(conditionalRequestCacheKey("user-2", "GET", "/x")),
    ).toBeUndefined();
    expect(
      store.get(conditionalRequestCacheKey("user-1", "GET", "/x"))?.etag,
    ).toBe("a");
  });

  test("evicts oldest entries once the byte budget is exceeded", () => {
    // Each entry is ~126 bytes (120-char body + quotes + etag), budget of 300
    // fits two: inserting the third must evict the oldest.
    const store = new InMemoryConditionalRequestStore(5000, 300);
    const entry = (etag: string) => ({
      etag,
      data: "x".repeat(120),
      status: 200,
    });
    store.set("k1", entry("e1"));
    store.set("k2", entry("e2"));
    store.set("k3", entry("e3"));
    expect(store.get("k1")).toBeUndefined();
    expect(store.get("k2")?.etag).toBe("e2");
    expect(store.get("k3")?.etag).toBe("e3");
  });

  test("does not cache a single response larger than the byte budget", () => {
    const store = new InMemoryConditionalRequestStore(5000, 100);
    store.set("small", { etag: "e", data: "ok", status: 200 });
    store.set("huge", { etag: "e", data: "x".repeat(500), status: 200 });
    expect(store.get("huge")).toBeUndefined();
    // The oversized body must not have evicted entries that do fit.
    expect(store.get("small")?.etag).toBe("e");
  });

  test("frees the byte budget when an entry is overwritten", () => {
    const store = new InMemoryConditionalRequestStore(5000, 300);
    const entry = (etag: string) => ({
      etag,
      data: "x".repeat(120),
      status: 200,
    });
    // Overwriting the same key must not double-count its bytes, so two more
    // distinct keys still fit alongside it.
    store.set("k1", entry("e1"));
    store.set("k1", entry("e1b"));
    store.set("k2", entry("e2"));
    expect(store.get("k1")?.etag).toBe("e1b");
    expect(store.get("k2")?.etag).toBe("e2");
  });
});

describe("conditionalRequestTokenScope", () => {
  test("is deterministic, distinct per token, and never leaks the token", () => {
    const a = conditionalRequestTokenScope("ghp_token_a");
    const b = conditionalRequestTokenScope("ghp_token_b");
    expect(a).toBe(conditionalRequestTokenScope("ghp_token_a"));
    expect(a).not.toBe(b);
    expect(a).not.toContain("ghp_token_a");
    expect(a.startsWith("token:")).toBe(true);
  });
});

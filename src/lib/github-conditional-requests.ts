import { createHash } from "node:crypto";
import type { Octokit } from "@octokit/rest";

/**
 * A single cached GitHub response, retained so that a later conditional request
 * which comes back `304 Not Modified` can be served from memory instead of
 * downloading the full body again. Only the fields the mirror actually consumes
 * are stored.
 */
export interface CachedResponse {
  etag: string;
  data: unknown;
  status: number;
  /** Preserved so `octokit.paginate` can keep following pages on a cache hit. */
  link?: string;
}

export interface ConditionalRequestStore {
  get(key: string): CachedResponse | undefined;
  set(key: string, value: CachedResponse): void;
}

/**
 * Process-lifetime, bounded in-memory store. Gitea Mirror runs as a long-lived
 * server whose scheduler re-syncs on an interval, so keeping ETags in memory is
 * enough to turn each repeated poll into a cheap `304`. Bounded both by entry
 * count and by total body bytes: a single 100-PR page can run to a few hundred
 * KB, so a count cap alone would let the store grow to gigabytes. Evicting an
 * entry only costs one full response on the next sync.
 */
export class InMemoryConditionalRequestStore implements ConditionalRequestStore {
  private readonly entries = new Map<
    string,
    { value: CachedResponse; bytes: number }
  >();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries = 5000,
    private readonly maxTotalBytes = 64 * 1024 * 1024,
  ) {}

  get(key: string): CachedResponse | undefined {
    return this.entries.get(key)?.value;
  }

  set(key: string, value: CachedResponse): void {
    const bytes = approximateResponseBytes(value);

    // Delete-then-set so Map iteration order approximates LRU for eviction.
    const existing = this.entries.get(key);
    if (existing) {
      this.totalBytes -= existing.bytes;
      this.entries.delete(key);
    }

    // A body larger than the whole budget would just evict everything else and
    // then fail to fit anyway; re-fetching it each sync is the cheaper failure.
    if (bytes > this.maxTotalBytes) return;

    this.entries.set(key, { value, bytes });
    this.totalBytes += bytes;

    while (
      this.entries.size > this.maxEntries ||
      this.totalBytes > this.maxTotalBytes
    ) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      const evicted = this.entries.get(oldest);
      this.entries.delete(oldest);
      if (evicted) this.totalBytes -= evicted.bytes;
    }
  }
}

/**
 * Rough byte cost of a cached response: the serialized body plus headers we
 * retain. Precision doesn't matter here, only that eviction tracks real memory
 * pressure instead of entry count.
 */
function approximateResponseBytes(value: CachedResponse): number {
  const body = value.data === undefined ? "" : JSON.stringify(value.data) ?? "";
  return body.length + value.etag.length + (value.link?.length ?? 0);
}

/**
 * Shared across every client so ETags survive the per-sync re-creation of the
 * Octokit instance (a fresh client is built on each scheduled sync).
 */
export const defaultConditionalRequestStore =
  new InMemoryConditionalRequestStore();

export function conditionalRequestCacheKey(
  scope: string,
  method: string,
  url: string,
): string {
  return `${scope} ${method.toUpperCase()} ${url}`;
}

/**
 * Cache scope for clients created with only a token (e.g. the metadata
 * mirroring path builds clients via `createGitHubClient(token)` with no user
 * id or username). Without this, all such clients would share one "default"
 * scope across users. Hashed so the raw token never appears in cache keys.
 */
export function conditionalRequestTokenScope(token: string): string {
  return `token:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
}

/**
 * Adds ETag-based conditional requests to an Octokit instance. For every GET it
 * replays the previously stored `If-None-Match`; GitHub then answers `304 Not
 * Modified` — which does not count against the token's primary rate limit —
 * whenever nothing changed, and the cached body is returned in place of a full
 * re-download. Non-GET requests are passed through untouched.
 *
 * The scope isolates cache entries per token/user so one account never reads
 * another's cached data.
 */
export function applyConditionalRequests(
  octokit: Octokit,
  options: { store?: ConditionalRequestStore; scope?: string } = {},
): void {
  // Some tests stub Octokit without the hook system; skip wiring in that case.
  if (typeof (octokit as any)?.hook?.wrap !== "function") return;

  const store = options.store ?? defaultConditionalRequestStore;
  const scope = options.scope ?? "default";

  octokit.hook.wrap("request", async (request: any, requestOptions: any): Promise<any> => {
    const method = String(requestOptions.method ?? "GET").toUpperCase();
    if (method !== "GET") {
      return request(requestOptions);
    }

    // Build the key from the expanded absolute URL, not the route template.
    // Inside the hook `requestOptions.url` is still `/repos/{owner}/{repo}/...`,
    // so keying on it would collapse every repo into a single entry per user +
    // endpoint and stop the 304 path from firing once more than one repo syncs.
    // `octokit.request.endpoint.parse` expands the route (owner/repo + query);
    // the chained `request` argument has no `.endpoint`, so it must come from
    // `octokit.request`.
    const parseEndpoint = (octokit as any)?.request?.endpoint?.parse;
    const expandedUrl =
      typeof parseEndpoint === "function"
        ? parseEndpoint(requestOptions).url
        : requestOptions.url;
    const key = conditionalRequestCacheKey(scope, method, expandedUrl);
    const cached = store.get(key);
    if (cached?.etag) {
      requestOptions.headers = {
        ...requestOptions.headers,
        "if-none-match": cached.etag,
      };
    }

    try {
      const response = await request(requestOptions);
      const etag = response?.headers?.etag;
      if (etag && response.status >= 200 && response.status < 300) {
        store.set(key, {
          etag,
          data: response.data,
          status: response.status,
          link: response.headers?.link,
        });
      }
      return response;
    } catch (error: any) {
      // GitHub answered "not modified": reuse the stored body, presented as a
      // 200 so callers (including octokit.paginate) are unaffected.
      if (error?.status === 304 && cached) {
        return {
          status: 200,
          url: expandedUrl,
          headers: {
            ...(error.response?.headers ?? {}),
            etag: cached.etag,
            ...(cached.link ? { link: cached.link } : {}),
          },
          data: cached.data,
        } as any;
      }
      throw error;
    }
  });
}

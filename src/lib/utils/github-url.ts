/**
 * Parsing for the GitHub references people paste into the add dialogs.
 *
 * Accepts what someone actually has on their clipboard: a browser URL, a clone
 * URL, an SSH remote, or the `owner/repo` shorthand. Deep links are fine too,
 * since the owner and repo sit at the front of the path and everything after
 * them (tree/blob/issues/...) is noise for our purposes.
 */

/** Path segments that follow github.com but are not an account name. */
const RESERVED_ROOT_SEGMENTS = new Set([
  "about",
  "apps",
  "collections",
  "contact",
  "customer-stories",
  "enterprise",
  "events",
  "explore",
  "features",
  "issues",
  "login",
  "marketplace",
  "notifications",
  "pricing",
  "pulls",
  "search",
  "security",
  "settings",
  "signup",
  "sponsors",
  "topics",
  "trending",
]);

/** Trailing segments GitHub appends to a repo URL that we can safely ignore. */
const GIT_SUFFIX = /\.git$/i;

function stripWrapping(input: string): string {
  // Markdown/angle-bracket wrapping survives a lot of copy-paste paths.
  return input
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

/**
 * Reduce any accepted form to its path segments.
 * Returns null when the input is not a GitHub-shaped reference at all.
 */
function toPathSegments(input: string): string[] | null {
  let value = stripWrapping(input);
  if (!value) return null;

  // git@github.com:owner/repo.git -> owner/repo.git
  const sshMatch = value.match(/^(?:ssh:\/\/)?git@[^:/]+[:/](.+)$/i);
  if (sshMatch) {
    value = sshMatch[1];
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^[^/\s]+\.[^/\s]+\//.test(value)) {
    // A full URL, or a bare host like "github.com/owner/repo".
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
      ? value
      : `https://${value}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      return null;
    }
    value = url.pathname;
  }

  const segments = value
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments : null;
}

function isUsableAccount(segment: string | undefined): segment is string {
  if (!segment) return false;
  if (RESERVED_ROOT_SEGMENTS.has(segment.toLowerCase())) return false;
  // GitHub account names: alphanumerics and hyphens.
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(segment);
}

function isUsableRepoName(segment: string | undefined): segment is string {
  if (!segment) return false;
  return /^[A-Za-z0-9._-]+$/.test(segment);
}

/**
 * Pull `{ owner, repo }` out of a repository reference.
 * Returns null when the input does not name a repository.
 */
export function parseGitHubRepoReference(
  input: string
): { owner: string; repo: string } | null {
  const segments = toPathSegments(input);
  if (!segments) return null;

  // /orgs/<name>/... never names a repository.
  if (segments[0]?.toLowerCase() === "orgs") return null;

  const [owner, rawRepo] = segments;
  if (!isUsableAccount(owner)) return null;

  const repo = rawRepo?.replace(GIT_SUFFIX, "");
  if (!isUsableRepoName(repo)) return null;

  return { owner, repo };
}

/**
 * Pull an organization (or user) name out of an account reference.
 * Accepts the profile URL, the /orgs/ form, and a bare name.
 */
export function parseGitHubOwnerReference(input: string): string | null {
  const segments = toPathSegments(input);
  if (!segments) return null;

  const candidate =
    segments[0]?.toLowerCase() === "orgs" ? segments[1] : segments[0];

  return isUsableAccount(candidate) ? candidate : null;
}

/** True when the input looks like a URL rather than a plain name. */
export function looksLikeUrl(input: string): boolean {
  const value = stripWrapping(input);
  return (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
    /^git@/i.test(value) ||
    value.includes("/")
  );
}

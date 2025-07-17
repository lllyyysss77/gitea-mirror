/**
 * Validates a redirect URI against a list of authorized URIs
 * @param redirectUri The redirect URI to validate
 * @param authorizedUris List of authorized redirect URIs
 * @returns true if the redirect URI is authorized, false otherwise
 */
export function isValidRedirectUri(redirectUri: string, authorizedUris: string[]): boolean {
  if (!redirectUri || authorizedUris.length === 0) {
    return false;
  }

  try {
    // Parse the redirect URI to ensure it's valid
    const redirectUrl = new URL(redirectUri);
    
    return authorizedUris.some(authorizedUri => {
      try {
        // Handle wildcard paths (e.g., https://example.com/*)
        if (authorizedUri.endsWith('/*')) {
          const baseUri = authorizedUri.slice(0, -2);
          const baseUrl = new URL(baseUri);
          
          // Check protocol, host, and port match
          return redirectUrl.protocol === baseUrl.protocol &&
                 redirectUrl.host === baseUrl.host &&
                 redirectUrl.pathname.startsWith(baseUrl.pathname);
        }
        
        // Handle exact match
        const authorizedUrl = new URL(authorizedUri);
        
        // For exact match, everything must match including path and query params
        return redirectUrl.href === authorizedUrl.href;
      } catch {
        // If authorized URI is not a valid URL, treat as invalid
        return false;
      }
    });
  } catch {
    // If redirect URI is not a valid URL, it's invalid
    return false;
  }
}

/**
 * Parses a comma-separated list of redirect URIs and trims whitespace
 * @param redirectUrls Comma-separated list of redirect URIs
 * @returns Array of trimmed redirect URIs
 */
export function parseRedirectUris(redirectUrls: string): string[] {
  if (!redirectUrls) {
    return [];
  }
  
  return redirectUrls
    .split(',')
    .map(uri => uri.trim())
    .filter(uri => uri.length > 0);
}
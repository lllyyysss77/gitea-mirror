import type { APIContext } from "astro";
import { createSecureErrorResponse } from "@/lib/utils";
import { requireAuth } from "@/lib/utils/auth-helpers";

// POST /api/sso/discover - Discover OIDC configuration from issuer URL
export async function POST(context: APIContext) {
  try {
    const { user, response } = await requireAuth(context);
    if (response) return response;

    const { issuer } = await context.request.json();

    if (!issuer) {
      return new Response(JSON.stringify({ error: "Issuer URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure issuer URL ends without trailing slash for well-known discovery
    const cleanIssuer = issuer.replace(/\/$/, "");
    const discoveryUrl = `${cleanIssuer}/.well-known/openid-configuration`;

    try {
      // Fetch OIDC discovery document
      const response = await fetch(discoveryUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch discovery document: ${response.status}`);
      }

      const config = await response.json();

      // Extract the essential endpoints
      const discoveredConfig = {
        issuer: config.issuer || cleanIssuer,
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userInfoEndpoint: config.userinfo_endpoint,
        jwksEndpoint: config.jwks_uri,
        // Additional useful fields
        scopes: config.scopes_supported || ["openid", "profile", "email"],
        responseTypes: config.response_types_supported || ["code"],
        grantTypes: config.grant_types_supported || ["authorization_code"],
        // Suggested domain from issuer
        suggestedDomain: new URL(cleanIssuer).hostname.replace("www.", ""),
      };

      return new Response(JSON.stringify(discoveredConfig), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("OIDC discovery error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to discover OIDC configuration",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return createSecureErrorResponse(error, "SSO discover API");
  }
}
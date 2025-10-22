import { describe, expect, it } from "bun:test";
import { normalizeOidcProviderConfig, OidcConfigError } from "./oidc-config";

const issuer = "https://auth.example.com";

describe("normalizeOidcProviderConfig", () => {
  it("returns provided endpoints when complete", async () => {
    const result = await normalizeOidcProviderConfig(issuer, {
      clientId: "client",
      clientSecret: "secret",
      authorizationEndpoint: "https://auth.example.com/auth",
      tokenEndpoint: "https://auth.example.com/token",
      jwksEndpoint: "https://auth.example.com/jwks",
      userInfoEndpoint: "https://auth.example.com/userinfo",
      scopes: ["openid", "email"],
      pkce: false,
    }, async () => {
      throw new Error("fetch should not be called when endpoints are provided");
    });

    expect(result.oidcConfig.authorizationEndpoint).toBe("https://auth.example.com/auth");
    expect(result.oidcConfig.tokenEndpoint).toBe("https://auth.example.com/token");
    expect(result.oidcConfig.jwksEndpoint).toBe("https://auth.example.com/jwks");
    expect(result.oidcConfig.userInfoEndpoint).toBe("https://auth.example.com/userinfo");
    expect(result.oidcConfig.scopes).toEqual(["openid", "email"]);
    expect(result.oidcConfig.pkce).toBe(false);
  });

  it("derives missing fields from discovery", async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({
        authorization_endpoint: "https://auth.example.com/auth",
        token_endpoint: "https://auth.example.com/token",
        jwks_uri: "https://auth.example.com/jwks",
        userinfo_endpoint: "https://auth.example.com/userinfo",
        scopes_supported: ["openid", "email", "profile"],
      }));

    const result = await normalizeOidcProviderConfig(issuer, {
      clientId: "client",
      clientSecret: "secret",
    }, fetchMock);

    expect(result.oidcConfig.authorizationEndpoint).toBe("https://auth.example.com/auth");
    expect(result.oidcConfig.tokenEndpoint).toBe("https://auth.example.com/token");
    expect(result.oidcConfig.jwksEndpoint).toBe("https://auth.example.com/jwks");
    expect(result.oidcConfig.userInfoEndpoint).toBe("https://auth.example.com/userinfo");
    expect(result.oidcConfig.scopes).toEqual(["openid", "email", "profile"]);
  });

  it("throws for invalid issuer URL", async () => {
    await expect(
      normalizeOidcProviderConfig("not-a-url", {}),
    ).rejects.toBeInstanceOf(OidcConfigError);
  });
});

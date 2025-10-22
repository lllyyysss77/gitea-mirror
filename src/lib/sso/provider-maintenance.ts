import { db, ssoProviders } from "@/lib/db";
import { normalizeOidcProviderConfig, OidcConfigError } from "./oidc-config";
import { eq } from "drizzle-orm";

type Logger = Pick<typeof console, "info" | "warn" | "error">;

export async function ensureValidSsoProviders(logger: Logger = console): Promise<void> {
  const providers = await db.select().from(ssoProviders);

  for (const provider of providers) {
    if (!provider.oidcConfig) continue;

    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(provider.oidcConfig);
    } catch (error) {
      logger.warn(`[SSO] Skipping provider ${provider.providerId}: invalid JSON configuration`, error);
      continue;
    }

    const hasEndpoints =
      parsedConfig.authorizationEndpoint &&
      parsedConfig.tokenEndpoint;

    const hasScopes = Array.isArray(parsedConfig.scopes) && parsedConfig.scopes.length > 0;

    if (hasEndpoints && hasScopes) {
      continue;
    }

    try {
      const normalized = await normalizeOidcProviderConfig(provider.issuer, {
        clientId: parsedConfig.clientId,
        clientSecret: parsedConfig.clientSecret,
        authorizationEndpoint: parsedConfig.authorizationEndpoint,
        tokenEndpoint: parsedConfig.tokenEndpoint,
        jwksEndpoint: parsedConfig.jwksEndpoint,
        userInfoEndpoint: parsedConfig.userInfoEndpoint,
        discoveryEndpoint: parsedConfig.discoveryEndpoint,
        scopes: parsedConfig.scopes,
        pkce: parsedConfig.pkce,
        mapping: parsedConfig.mapping,
      });

      await db
        .update(ssoProviders)
        .set({
          oidcConfig: JSON.stringify({
            ...normalized.oidcConfig,
            mapping: normalized.mapping,
          }),
          updatedAt: new Date(),
        })
        .where(eq(ssoProviders.id, provider.id));

      logger.info(`[SSO] Normalized OIDC configuration for provider ${provider.providerId}`);
    } catch (error) {
      if (error instanceof OidcConfigError) {
        logger.warn(`[SSO] Unable to normalize provider ${provider.providerId}: ${error.message}`);
      } else {
        logger.error(`[SSO] Unexpected error normalizing provider ${provider.providerId}`, error);
      }
    }
  }
}

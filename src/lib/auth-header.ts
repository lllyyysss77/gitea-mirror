import { db, users } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface HeaderAuthConfig {
  enabled: boolean;
  userHeader: string;
  emailHeader?: string;
  nameHeader?: string;
  autoProvision: boolean;
  allowedDomains?: string[];
}

// Default configuration - DISABLED by default
export const defaultHeaderAuthConfig: HeaderAuthConfig = {
  enabled: false,
  userHeader: "X-Authentik-Username", // Common header name
  emailHeader: "X-Authentik-Email",
  nameHeader: "X-Authentik-Name",
  autoProvision: false,
  allowedDomains: [],
};

// Get header auth config from environment or database
export function getHeaderAuthConfig(): HeaderAuthConfig {
  // Check environment variables for header auth config
  const envConfig: Partial<HeaderAuthConfig> = {
    enabled: process.env.HEADER_AUTH_ENABLED === "true",
    userHeader: process.env.HEADER_AUTH_USER_HEADER || defaultHeaderAuthConfig.userHeader,
    emailHeader: process.env.HEADER_AUTH_EMAIL_HEADER || defaultHeaderAuthConfig.emailHeader,
    nameHeader: process.env.HEADER_AUTH_NAME_HEADER || defaultHeaderAuthConfig.nameHeader,
    autoProvision: process.env.HEADER_AUTH_AUTO_PROVISION === "true",
    allowedDomains: process.env.HEADER_AUTH_ALLOWED_DOMAINS?.split(",").map(d => d.trim()),
  };

  return {
    ...defaultHeaderAuthConfig,
    ...envConfig,
  };
}

// Check if header authentication is enabled
export function isHeaderAuthEnabled(): boolean {
  const config = getHeaderAuthConfig();
  return config.enabled === true;
}

// Extract user info from headers
export function extractUserFromHeaders(headers: Headers): {
  username?: string;
  email?: string;
  name?: string;
} | null {
  const config = getHeaderAuthConfig();
  
  if (!config.enabled) {
    return null;
  }

  const username = headers.get(config.userHeader);
  const email = config.emailHeader ? headers.get(config.emailHeader) : undefined;
  const name = config.nameHeader ? headers.get(config.nameHeader) : undefined;

  if (!username) {
    return null;
  }

  // If allowed domains are configured, check email domain
  if (config.allowedDomains && config.allowedDomains.length > 0 && email) {
    const domain = email.split("@")[1];
    if (!config.allowedDomains.includes(domain)) {
      console.warn(`Header auth rejected: email domain ${domain} not in allowed list`);
      return null;
    }
  }

  return { username, email, name };
}

// Find or create user from header auth
export async function authenticateWithHeaders(headers: Headers) {
  const userInfo = extractUserFromHeaders(headers);
  
  if (!userInfo || !userInfo.username) {
    return null;
  }

  const config = getHeaderAuthConfig();

  // Try to find existing user by username or email
  let existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, userInfo.username))
    .limit(1);

  if (existingUser.length === 0 && userInfo.email) {
    existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userInfo.email))
      .limit(1);
  }

  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // If auto-provisioning is disabled, don't create new users
  if (!config.autoProvision) {
    console.warn(`Header auth: User ${userInfo.username} not found and auto-provisioning is disabled`);
    return null;
  }

  // Create new user if auto-provisioning is enabled
  try {
    const newUser = {
      id: nanoid(),
      username: userInfo.username,
      email: userInfo.email || `${userInfo.username}@header-auth.local`,
      emailVerified: true, // Trust the auth provider
      name: userInfo.name || userInfo.username,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);
    console.log(`Header auth: Auto-provisioned new user ${userInfo.username}`);
    
    return newUser;
  } catch (error) {
    console.error("Failed to auto-provision user from header auth:", error);
    return null;
  }
}
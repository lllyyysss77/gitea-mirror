import type { APIRoute } from "astro";
import { getHeaderAuthConfig } from "@/lib/auth-header";

export const GET: APIRoute = async () => {
  const config = getHeaderAuthConfig();
  
  return new Response(JSON.stringify({
    enabled: config.enabled,
    userHeader: config.userHeader,
    autoProvision: config.autoProvision,
    hasAllowedDomains: config.allowedDomains && config.allowedDomains.length > 0,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
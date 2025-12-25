/**
 * Web routes - route definitions
 */

import { Route } from "./Route";
import { handleWirePost } from "./handlers/wirePost";
import { handleJsonApi } from "./handlers/jsonApi";
import { handleWireGet } from "./handlers/wireGet";
import { handleHealth } from "./handlers/health";
import { handleHelp } from "./handlers/help";
import { PATH_DNS_QUERY, PATH_DNS_JSON, PATH_RESOLVE, PATH_HEALTH, PATH_ROOT, PATH_HELP } from "../config/constants";
import { ParsedRequest } from "../utils/requestParser";

/**
 * Define all application routes
 */
export function defineRoutes(): void {
  // Wire-format POST (RFC 8484)
  Route.post(
    PATH_DNS_QUERY,
    async (req: ParsedRequest, request: Request, upstreams: string[]) => {
      // Check content-type in handler since Route can't access headers directly
      if (!req.contentType.includes("application/dns-message")) {
        return null;
      }
      return handleWirePost(req, request, upstreams);
    },
    "dns.wire.post"
  );

  // JSON API GET - multiple paths
  Route.get(
    (path: string, req?: ParsedRequest) => {
      // Match JSON API paths: /dns-json, /resolve, or /dns-query with name param
      if (!req) return false;
      return path === PATH_DNS_JSON || 
             path === PATH_RESOLVE || 
             (path === PATH_DNS_QUERY && req.isJsonApi);
    },
    async (req: ParsedRequest, request: Request, upstreams: string[]) => {
      return handleJsonApi(req, request, upstreams);
    },
    "dns.json.get"
  );

  // Wire-format GET (RFC 8484)
  Route.get(
    PATH_DNS_QUERY,
    async (req: ParsedRequest, request: Request, upstreams: string[]) => {
      // Only handle wire format GET, not JSON API
      if (req.isJsonApi) return null;
      return handleWireGet(req, request, upstreams);
    },
    "dns.wire.get"
  );

  // Health check endpoint
  Route.get(PATH_HEALTH, handleHealth, "health");

  // Help/documentation endpoint
  Route.get(
    (path: string) => path === PATH_ROOT || path === PATH_HELP,
    handleHelp,
    "help"
  );
}

// Export a function that sets req context (for backward compatibility)
export function setRequestContext(_request: ParsedRequest): void {
  // No longer needed, but kept for compatibility
}


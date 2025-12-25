/**
 * DNS-over-HTTPS (DoH) Cloudflare Worker
 * Supports RFC 8484 wire format and JSON API formats (Cloudflare/Google/Quad9 compatible)
 */

import { getUpstreams } from "./config/upstreams";
import { parseRequest } from "./utils/requestParser";
import { internalError } from "./responses/errorHandler";
import { addCorsHeaders, handleCorsPreflight } from "./responses/cors";
import { route } from "./routes";

/**
 * Main worker export
 */
export default {
  /**
   * Handles incoming DoH requests
   * @param request The incoming HTTP request
   * @param env Environment variables (may contain UPSTREAM override)
   * @param ctx Execution context
   * @returns Response with DNS data or error
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return handleCorsPreflight();
    }

    try {
      const req = parseRequest(request);
      const upstreams = getUpstreams(env);
      const response = await route(req, request, upstreams);
      return addCorsHeaders(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return addCorsHeaders(internalError(errorMessage || "Internal server error"));
    }
  },
};

/**
 * Environment variables interface for Cloudflare Worker
 */
export interface Env {
  /** Optional upstream DoH server URL to override default upstreams */
  UPSTREAM?: string;
}

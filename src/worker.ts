/**
 * DNS-over-HTTPS (DoH) Cloudflare Worker
 * Supports RFC 8484 wire format and JSON API formats (Cloudflare/Google/Quad9 compatible)
 */

import { getUpstreams, buildUpstreamUrl, Upstream } from "./upstreams";
import { passthroughWire } from "./passthroughWire";
import { parseRequest, ParsedRequest } from "./requestParser";
import { badRequest, internalError, notFound, healthResponse, payloadTooLarge } from "./errorHandler";
import { helpResponse } from "./help";
import { addCorsHeaders, handleCorsPreflight } from "./cors";
import { validateBase64Url, validateDomainName, validateBodySize } from "./validation";
import {
  CONTENT_TYPE_DNS_MESSAGE,
  CONTENT_TYPE_DNS_JSON,
  CACHE_TTL,
  PATH_DNS_QUERY,
  PATH_DNS_JSON,
  PATH_RESOLVE,
  PATH_HEALTH,
  PATH_HELP,
  PATH_ROOT,
  MAX_DNS_MESSAGE_SIZE,
} from "./constants";

/**
 * Standard cache configuration for Cloudflare Workers
 */
const CACHE_CONFIG = {
  cf: {
    cacheTtl: CACHE_TTL,
    cacheEverything: false,
  },
};

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

    const req: ParsedRequest = parseRequest(request);
    const upstreams: Upstream[] = getUpstreams(env);

    /**
     * Tries multiple upstreams in sequence until one succeeds
     * @param fn Function that makes request to an upstream
     * @returns Response from first successful upstream
     * @throws Error if all upstreams fail
     */
    async function tryUpstreams(fn: (upstream: Upstream) => Promise<Response>): Promise<Response> {
      let lastErr: Error = new Error("No upstreams available");
      for (const up of upstreams) {
        try {
          const resp = await fn(up);
          if (resp.status >= 500) {
            lastErr = new Error(`Upstream ${up.provider} returned ${resp.status}`);
            continue;
          }
          return resp;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
          continue;
        }
      }
      throw lastErr;
    }

    try {
      // Wire-format POST (RFC 8484)
      // Endpoint: POST /dns-query with Content-Type: application/dns-message
      if (req.method === "POST" && req.contentType.includes(CONTENT_TYPE_DNS_MESSAGE)) {
        const body = await request.arrayBuffer();
        
        // Validate body size
        if (!validateBodySize(body.byteLength)) {
          return addCorsHeaders(payloadTooLarge(
            `DNS message size ${body.byteLength} bytes exceeds maximum of ${MAX_DNS_MESSAGE_SIZE} bytes`
          ));
        }
        
        if (body.byteLength === 0) {
          return addCorsHeaders(badRequest("Empty DNS message body"));
        }
        
        const resp = await tryUpstreams((upstream) =>
          fetch(new Request(buildUpstreamUrl(upstream, "wire"), {
            method: "POST",
            headers: {
              "content-type": CONTENT_TYPE_DNS_MESSAGE,
              "accept": CONTENT_TYPE_DNS_MESSAGE,
            },
            body,
          }), CACHE_CONFIG)
        );
        return addCorsHeaders(await passthroughWire(resp));
      }

      // JSON GET (Cloudflare/Google/Quad9 style)
      // Endpoints: /dns-json?name=... or /resolve?name=... or /dns-query?name=...&ct=application/dns-json
      // Check JSON API FIRST to handle Quad9 style (/dns-query with name param) correctly
      if (req.method === "GET" && req.isJsonApi) {
        const nameValue = req.nameParam;
        if (!nameValue) {
          return addCorsHeaders(badRequest("Missing required 'name' query parameter"));
        }
        
        // Validate domain name format
        if (!validateDomainName(nameValue)) {
          return addCorsHeaders(badRequest(`Invalid domain name format: ${nameValue}`));
        }
        
        const resp = await tryUpstreams((upstream) => {
          const url = buildUpstreamUrl(upstream, "json");
          // Copy query parameters from request URL to upstream URL
          const requestUrl = new URL(request.url);
          requestUrl.searchParams.forEach((value, key) => {
            url.searchParams.set(key, value);
          });
          return fetch(url.toString(), {
            headers: { "accept": CONTENT_TYPE_DNS_JSON },
          });
        });
        
        const responseText = await resp.text();
        return addCorsHeaders(new Response(responseText, {
          status: resp.status,
          headers: {
            "content-type": CONTENT_TYPE_DNS_JSON,
            "cache-control": resp.headers.get("cache-control") ?? `max-age=${CACHE_TTL}`,
          },
        }));
      }

      // Wire-format GET (RFC 8484)
      // Endpoint: GET /dns-query?dns=<base64url-encoded-dns-message>
      // Only process if not already handled as JSON API above
      if (req.method === "GET" && req.hasDnsParam) {
        const dnsValue = req.dnsParam;
        if (!dnsValue) {
          return addCorsHeaders(badRequest("Missing required 'dns' query parameter"));
        }
        
        // Validate base64url format
        if (!validateBase64Url(dnsValue)) {
          return addCorsHeaders(badRequest("Invalid 'dns' parameter format. Must be base64url-encoded."));
        }
        
        const resp = await tryUpstreams((upstream) => {
          const url = buildUpstreamUrl(upstream, "wire");
          url.searchParams.set("dns", dnsValue);
          return fetch(new Request(url.toString(), {
            headers: { "accept": CONTENT_TYPE_DNS_MESSAGE },
          }), CACHE_CONFIG);
        });
        return addCorsHeaders(await passthroughWire(resp));
      }

      // Health check endpoint
      if (req.path === PATH_HEALTH) {
        return addCorsHeaders(healthResponse());
      }

      // Help/documentation endpoint
      if (req.path === PATH_ROOT || req.path === PATH_HELP) {
        return addCorsHeaders(helpResponse());
      }

      return addCorsHeaders(notFound());
    } catch (err: unknown) {
      // Properly handle errors with type narrowing
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

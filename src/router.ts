/**
 * Request router for DoH worker
 * Handles routing logic and delegates to appropriate handlers
 */

import { ParsedRequest } from "./requestParser";
import { passthroughWire } from "./passthroughWire";
import { badRequest, payloadTooLarge, healthResponse, notFound } from "./errorHandler";
import { helpResponse } from "./help";
import { validateBase64Url, validateDomainName, validateBodySize } from "./validation";
import {
  CONTENT_TYPE_DNS_MESSAGE,
  CONTENT_TYPE_DNS_JSON,
  CACHE_TTL,
  PATH_DNS_QUERY,
  PATH_HEALTH,
  PATH_HELP,
  PATH_ROOT,
  MAX_DNS_MESSAGE_SIZE,
} from "./constants";

/**
 * Context for route handlers
 */
export type RouteContext = {
  request: Request;
  upstreams: string[];
  tryUpstreams: (urlBuilder: (base: string) => string, options?: RequestInit) => Promise<Response>;
};

/**
 * Route handler function type
 * Returns Response if the route matches, null if it doesn't
 */
type RouteHandler = (req: ParsedRequest, ctx: RouteContext) => Promise<Response | null>;

/**
 * Tries multiple upstreams in sequence until one succeeds
 */
export function createTryUpstreams(upstreams: string[]): RouteContext["tryUpstreams"] {
  return async function tryUpstreams(
    urlBuilder: (base: string) => string,
    options?: RequestInit
  ): Promise<Response> {
    let lastErr: Error = new Error("No upstreams available");
    for (const base of upstreams) {
      try {
        const url = urlBuilder(base);
        const resp = await fetch(url, options);
        if (resp.status >= 500) {
          lastErr = new Error(`Upstream ${base} returned ${resp.status}`);
          continue;
        }
        return resp;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        continue;
      }
    }
    throw lastErr;
  };
}

/**
 * Handles wire-format POST requests (RFC 8484)
 */
async function handleWirePost(req: ParsedRequest, ctx: RouteContext): Promise<Response | null> {
  if (req.method !== "POST" || !req.contentType.includes(CONTENT_TYPE_DNS_MESSAGE)) {
    return null;
  }

  const body = await ctx.request.arrayBuffer();

  // Validate body size
  if (!validateBodySize(body.byteLength)) {
    return payloadTooLarge(
      `DNS message size ${body.byteLength} bytes exceeds maximum of ${MAX_DNS_MESSAGE_SIZE} bytes`
    );
  }

  if (body.byteLength === 0) {
    return badRequest("Empty DNS message body");
  }

  const resp = await ctx.tryUpstreams(
    (base) => `${base}${PATH_DNS_QUERY}`,
    {
      method: "POST",
      headers: {
        "content-type": CONTENT_TYPE_DNS_MESSAGE,
        "accept": CONTENT_TYPE_DNS_MESSAGE,
      },
      body,
      ...CACHE_CONFIG,
    }
  );
  return passthroughWire(resp);
}

/**
 * Handles JSON API GET requests
 */
async function handleJsonApi(req: ParsedRequest, ctx: RouteContext): Promise<Response | null> {
  if (req.method !== "GET" || !req.isJsonApi) {
    return null;
  }

  const nameValue = req.nameParam;
  if (!nameValue) {
    return badRequest("Missing required 'name' query parameter");
  }

  // Validate domain name format
  if (!validateDomainName(nameValue)) {
    return badRequest(`Invalid domain name format: ${nameValue}`);
  }

  const requestUrl = new URL(ctx.request.url);
  const resp = await ctx.tryUpstreams((base) => {
    const url = new URL(`${base}${PATH_DNS_QUERY}`);
    // Copy query parameters from request URL to upstream URL
    requestUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }, {
    headers: { "accept": CONTENT_TYPE_DNS_JSON },
  });

  const responseText = await resp.text();
  return new Response(responseText, {
    status: resp.status,
    headers: {
      "content-type": CONTENT_TYPE_DNS_JSON,
      "cache-control": resp.headers.get("cache-control") ?? `max-age=${CACHE_TTL}`,
    },
  });
}

/**
 * Handles wire-format GET requests (RFC 8484)
 */
async function handleWireGet(req: ParsedRequest, ctx: RouteContext): Promise<Response | null> {
  if (req.method !== "GET" || req.path !== PATH_DNS_QUERY || req.isJsonApi) {
    return null;
  }

  if (req.dnsParam === null) {
    return badRequest("Missing required 'dns' query parameter");
  }

  const dnsValue = req.dnsParam;

  // Validate base64url format
  if (!validateBase64Url(dnsValue)) {
    return badRequest("Invalid 'dns' parameter format. Must be base64url-encoded.");
  }

  const resp = await ctx.tryUpstreams(
    (base) => `${base}${PATH_DNS_QUERY}?dns=${encodeURIComponent(dnsValue)}`,
    {
      headers: { "accept": CONTENT_TYPE_DNS_MESSAGE },
      ...CACHE_CONFIG,
    }
  );
  return passthroughWire(resp);
}

/**
 * Handles health check endpoint
 */
async function handleHealth(req: ParsedRequest, _ctx: RouteContext): Promise<Response | null> {
  if (req.path === PATH_HEALTH) {
    return healthResponse();
  }
  return null;
}

/**
 * Handles help/documentation endpoint
 */
async function handleHelp(req: ParsedRequest, _ctx: RouteContext): Promise<Response | null> {
  if (req.path === PATH_ROOT || req.path === PATH_HELP) {
    return helpResponse();
  }
  return null;
}

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
 * Route handlers in order of evaluation
 */
const ROUTES: RouteHandler[] = [
  handleWirePost,
  handleJsonApi,
  handleWireGet,
  handleHealth,
  handleHelp,
];

/**
 * Routes a parsed request to the appropriate handler
 * @param req Parsed request information
 * @param ctx Route context with request, upstreams, and tryUpstreams function
 * @returns Response from matched route handler, or null if no route matched
 */
export async function route(req: ParsedRequest, ctx: RouteContext): Promise<Response> {
  for (const handler of ROUTES) {
    const response = await handler(req, ctx);
    if (response !== null) {
      return response;
    }
  }
  return notFound();
}


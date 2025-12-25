/**
 * Upstream provider definitions and helpers
 * Manages the list of DNS-over-HTTPS upstream providers
 */

import { PATH_DNS_QUERY, PATH_DNS_JSON, PATH_RESOLVE, PARAM_CT, CONTENT_TYPE_DNS_JSON } from "./constants";

/**
 * Configuration for a DNS-over-HTTPS upstream provider
 */
export type Upstream = {
  /** Provider name (for logging/debugging) */
  provider: string;
  /** Base URL of the upstream DoH server */
  base: string;
  /** Path for wire-format requests (RFC 8484) */
  wirePath: string;
  /** Path for JSON API requests */
  jsonPath: string;
  /** Optional content-type parameter for JSON requests (used by Quad9) */
  jsonCt?: string;
};

/**
 * Default list of well-known DoH upstream providers
 * Used when no custom UPSTREAM is configured
 */
export const DEFAULT_UPSTREAMS: Upstream[] = [
  // Cloudflare-style DNS-over-HTTPS endpoints
  {
    provider: "cloudflare",
    base: "https://cloudflare-dns.com",
    wirePath: PATH_DNS_QUERY,
    jsonPath: PATH_DNS_JSON,
  },
  {
    provider: "cloudflare-alt",
    base: "https://1.1.1.1",
    wirePath: PATH_DNS_QUERY,
    jsonPath: PATH_DNS_JSON,
  },
  // Google-style DNS-over-HTTPS endpoint
  {
    provider: "google",
    base: "https://dns.google",
    wirePath: PATH_DNS_QUERY,
    jsonPath: PATH_RESOLVE,
  },
  // Quad9 (uses content-type parameter for JSON)
  {
    provider: "quad9",
    base: "https://dns.quad9.net",
    wirePath: PATH_DNS_QUERY,
    jsonPath: PATH_DNS_QUERY,
    jsonCt: CONTENT_TYPE_DNS_JSON,
  },
];

/**
 * Gets the list of upstream providers to use
 * @param env Environment variables (may contain UPSTREAM override)
 * @returns Array of Upstream configurations
 */
export function getUpstreams(env: { UPSTREAM?: string }): Upstream[] {
  if (env.UPSTREAM && env.UPSTREAM.trim() !== "") {
    return [{
      provider: "custom",
      base: env.UPSTREAM,
      wirePath: PATH_DNS_QUERY,
      jsonPath: PATH_DNS_QUERY,
    }];
  }
  return DEFAULT_UPSTREAMS;
}

/**
 * Builds a URL for an upstream provider request
 * @param upstream The upstream provider configuration
 * @param type Request type: "wire" for RFC 8484 wire format, "json" for JSON API
 * @returns URL object ready for fetch
 */
export function buildUpstreamUrl(upstream: Upstream, type: "wire" | "json"): URL {
  const url = new URL(upstream.base);
  if (type === "wire") {
    url.pathname = upstream.wirePath;
  } else {
    url.pathname = upstream.jsonPath;
    if (upstream.jsonCt) {
      url.searchParams.set(PARAM_CT, upstream.jsonCt);
    }
  }
  return url;
}

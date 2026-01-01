/**
 * Upstream provider definitions
 * Simple list of DNS-over-HTTPS upstream base URLs
 */

/**
 * Default list of well-known DoH upstream providers
 * Used when no custom UPSTREAM is configured
 */
export const DEFAULT_UPSTREAMS: string[] = [
  "https://cloudflare-dns.com",
  "https://1.1.1.1",
  "https://dns.google",
  "https://dns.quad9.net",
];

/**
 * Gets the list of upstream URLs to use
 * @param env Environment variables (may contain UPSTREAM override)
 * @returns Array of upstream base URLs
 */
export function getUpstreams(env: { UPSTREAM?: string }): string[] {
  if (env.UPSTREAM && env.UPSTREAM.trim() !== "") {
    return [env.UPSTREAM.trim()];
  }
  return DEFAULT_UPSTREAMS;
}



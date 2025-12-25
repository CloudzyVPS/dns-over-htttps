/**
 * Helper function to pass through RFC 8484 wire-format responses unchanged
 * See: https://datatracker.ietf.org/doc/html/rfc8484#section-4.2
 */

import { CONTENT_TYPE_DNS_MESSAGE, CACHE_TTL } from "../config/constants";

/**
 * Passes through a wire-format DNS response from upstream, preserving the binary format
 */
export async function passthroughWire(resp: Response): Promise<Response> {
  const buf = await resp.arrayBuffer();
  return new Response(buf, {
    status: resp.status,
    headers: {
      "content-type": CONTENT_TYPE_DNS_MESSAGE,
      "cache-control": resp.headers.get("cache-control") ?? `max-age=${CACHE_TTL}`,
    },
  });
}


/**
 * Helper function to pass through RFC 8484 wire-format responses unchanged
 * See: https://datatracker.ietf.org/doc/html/rfc8484#section-4.2
 */

import { CONTENT_TYPE_DNS_MESSAGE, CACHE_TTL } from "./constants";

/**
 * Passes through a wire-format DNS response from upstream, preserving the binary format
 * @param resp Response from upstream DoH server
 * @returns Promise resolving to a new Response with proper headers
 */
export function passthroughWire(resp: Response): Promise<Response> {
  return resp.arrayBuffer().then((buf) =>
    new Response(buf, {
      status: resp.status,
      headers: {
        "content-type": CONTENT_TYPE_DNS_MESSAGE, // RFC 8484 section 6
        "cache-control": resp.headers.get("cache-control") ?? `max-age=${CACHE_TTL}`,
      },
    })
  );
}

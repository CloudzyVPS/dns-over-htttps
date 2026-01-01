/**
 * Wire-format GET request handler (RFC 8484)
 */

import { ParsedRequest } from "../../utils/requestParser";
import { passthroughWire } from "../../utils/passthroughWire";
import { badRequest } from "../../responses/errorHandler";
import { validateBase64Url } from "../../utils/validation";
import { CONTENT_TYPE_DNS_MESSAGE, PATH_DNS_QUERY, CACHE_TTL } from "../../config/constants";
import { tryUpstreams } from "../../utils/upstreams";

const CACHE_CONFIG = {
  cf: {
    cacheTtl: CACHE_TTL,
    cacheEverything: false,
  },
};

export async function handleWireGet(
  req: ParsedRequest,
  _request: Request,
  upstreams: string[]
): Promise<Response | null> {
  if (req.method !== "GET" || req.path !== PATH_DNS_QUERY || req.isJsonApi) return null;
  if (!req.dnsParam) return badRequest("Missing required 'dns' query parameter");
  if (!validateBase64Url(req.dnsParam)) {
    return badRequest("Invalid 'dns' parameter format. Must be base64url-encoded.");
  }

  const resp = await tryUpstreams(
    upstreams,
    (base) => `${base}${PATH_DNS_QUERY}?dns=${encodeURIComponent(req.dnsParam!)}`,
    {
      headers: { "accept": CONTENT_TYPE_DNS_MESSAGE },
      ...CACHE_CONFIG,
    }
  );
  return passthroughWire(resp);
}



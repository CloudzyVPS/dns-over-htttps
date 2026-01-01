/**
 * Wire-format POST request handler (RFC 8484)
 */

import { ParsedRequest } from "../../utils/requestParser";
import { passthroughWire } from "../../utils/passthroughWire";
import { badRequest, payloadTooLarge } from "../../responses/errorHandler";
import { validateBodySize } from "../../utils/validation";
import { CONTENT_TYPE_DNS_MESSAGE, PATH_DNS_QUERY, MAX_DNS_MESSAGE_SIZE, CACHE_TTL } from "../../config/constants";
import { tryUpstreams } from "../../utils/upstreams";

const CACHE_CONFIG = {
  cf: {
    cacheTtl: CACHE_TTL,
    cacheEverything: false,
  },
};

export async function handleWirePost(
  req: ParsedRequest,
  request: Request,
  upstreams: string[]
): Promise<Response | null> {
  if (req.method !== "POST" || !req.contentType.includes(CONTENT_TYPE_DNS_MESSAGE)) {
    return null;
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return badRequest("Empty DNS message body");
  if (!validateBodySize(body.byteLength)) {
    return payloadTooLarge(
      `DNS message size ${body.byteLength} bytes exceeds maximum of ${MAX_DNS_MESSAGE_SIZE} bytes`
    );
  }

  const resp = await tryUpstreams(upstreams, (base) => `${base}${PATH_DNS_QUERY}`, {
    method: "POST",
    headers: {
      "content-type": CONTENT_TYPE_DNS_MESSAGE,
      "accept": CONTENT_TYPE_DNS_MESSAGE,
    },
    body,
    ...CACHE_CONFIG,
  });
  return passthroughWire(resp);
}



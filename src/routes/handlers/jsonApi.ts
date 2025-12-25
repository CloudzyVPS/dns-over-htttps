/**
 * JSON API GET request handler
 */

import { ParsedRequest } from "../../utils/requestParser";
import { badRequest } from "../../responses/errorHandler";
import { validateDomainName } from "../../utils/validation";
import { CONTENT_TYPE_DNS_JSON, PATH_DNS_QUERY, CACHE_TTL } from "../../config/constants";
import { tryUpstreams } from "../../utils/upstreams";

export async function handleJsonApi(
  req: ParsedRequest,
  request: Request,
  upstreams: string[]
): Promise<Response | null> {
  if (req.method !== "GET" || !req.isJsonApi) return null;
  if (!req.nameParam) return badRequest("Missing required 'name' query parameter");
  if (!validateDomainName(req.nameParam)) {
    return badRequest(`Invalid domain name format: ${req.nameParam}`);
  }

  const requestUrl = new URL(request.url);
  const resp = await tryUpstreams(upstreams, (base) => {
    const url = new URL(`${base}${PATH_DNS_QUERY}`);
    requestUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }, {
    headers: { "accept": CONTENT_TYPE_DNS_JSON },
  });

  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: {
      "content-type": CONTENT_TYPE_DNS_JSON,
      "cache-control": resp.headers.get("cache-control") ?? `max-age=${CACHE_TTL}`,
    },
  });
}


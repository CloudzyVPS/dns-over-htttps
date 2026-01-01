/**
 * Request parsing helpers for DoH worker
 */

import { PATH_DNS_QUERY, PATH_DNS_JSON, PATH_RESOLVE, PARAM_DNS, PARAM_NAME, PARAM_CT, CONTENT_TYPE_DNS_JSON } from "../config/constants";

/**
 * Parsed request information extracted from HTTP request
 */
export type ParsedRequest = {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Content-Type header value (lowercased) */
  contentType: string;
  /** Value of the 'dns' query parameter (base64url-encoded DNS message) */
  dnsParam: string | null;
  /** Value of the 'name' query parameter (domain name) */
  nameParam: string | null;
  /** Request pathname */
  path: string;
  /** Whether this is a JSON API request (based on path or parameters) */
  isJsonApi: boolean;
};

/**
 * Parses an HTTP request and extracts relevant DoH information
 * @param request The incoming HTTP request
 * @returns ParsedRequest object with extracted information
 */
export function parseRequest(request: Request): ParsedRequest {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const dnsParam = url.searchParams.get(PARAM_DNS);
  const nameParam = url.searchParams.get(PARAM_NAME);
  const ctParam = url.searchParams.get(PARAM_CT);
  const path = url.pathname;
  
  // Determine if this is a JSON API request:
  // 1. Path is /dns-json or /resolve (Cloudflare/Google style)
  // 2. Path is /dns-query with name param (Quad9 style)
  // 3. Has ct=application/dns-json parameter (Quad9 style)
  const isJsonApi = path.endsWith(PATH_DNS_JSON) || 
                    path.endsWith(PATH_RESOLVE) ||
                    (path.endsWith(PATH_DNS_QUERY) && nameParam !== null) ||
                    (ctParam?.toLowerCase() === CONTENT_TYPE_DNS_JSON);
  
  return {
    method: request.method,
    contentType,
    dnsParam,
    nameParam,
    path,
    isJsonApi,
  };
}



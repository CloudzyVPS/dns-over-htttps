/**
 * Request parsing helpers for DoH worker
 */

import { PATH_DNS_QUERY, PATH_DNS_JSON, PATH_RESOLVE, PARAM_DNS, PARAM_NAME, PARAM_CT, CONTENT_TYPE_DNS_JSON } from "./constants";

/**
 * Parsed request information extracted from HTTP request
 */
export type ParsedRequest = {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Content-Type header value (lowercased) */
  contentType: string;
  /** Whether the 'dns' query parameter is present */
  hasDnsParam: boolean;
  /** Value of the 'dns' query parameter (base64url-encoded DNS message) */
  dnsParam: string | null;
  /** Whether the 'name' query parameter is present */
  hasNameParam: boolean;
  /** Value of the 'name' query parameter (domain name) */
  nameParam: string | null;
  /** Whether the 'ct' query parameter is present (used by Quad9 for JSON API) */
  hasCtParam: boolean;
  /** Value of the 'ct' query parameter */
  ctParam: string | null;
  /** Request pathname */
  path: string;
  /** Whether path ends with /dns-query */
  pathIsDnsQuery: boolean;
  /** Whether path is a JSON API endpoint (/dns-json or /resolve) */
  pathIsDnsJson: boolean;
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
  const hasDnsParam = url.searchParams.has(PARAM_DNS);
  const dnsParam = url.searchParams.get(PARAM_DNS);
  const hasNameParam = url.searchParams.has(PARAM_NAME);
  const nameParam = url.searchParams.get(PARAM_NAME);
  const hasCtParam = url.searchParams.has(PARAM_CT);
  const ctParam = url.searchParams.get(PARAM_CT);
  const path = url.pathname;
  const pathIsDnsQuery = path.endsWith(PATH_DNS_QUERY);
  const pathIsDnsJson = path.endsWith(PATH_DNS_JSON) || path.endsWith(PATH_RESOLVE);
  
  // Determine if this is a JSON API request:
  // 1. Path is /dns-json or /resolve (Cloudflare/Google style)
  // 2. Path is /dns-query with name param (Quad9 style)
  // 3. Has ct=application/dns-json parameter (Quad9 style)
  const isJsonApi = pathIsDnsJson || 
                    (pathIsDnsQuery && hasNameParam) ||
                    (hasCtParam && ctParam?.toLowerCase() === CONTENT_TYPE_DNS_JSON);
  
  return {
    method: request.method,
    contentType,
    hasDnsParam,
    dnsParam,
    hasNameParam,
    nameParam,
    hasCtParam,
    ctParam,
    path,
    pathIsDnsQuery,
    pathIsDnsJson,
    isJsonApi,
  };
}

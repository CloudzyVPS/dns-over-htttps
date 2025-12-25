// Request parsing helpers
export type ParsedRequest = {
  method: string;
  contentType: string;
  hasDnsParam: boolean;
  dnsParam: string | null;
  hasNameParam: boolean;
  nameParam: string | null;
  path: string;
  pathIsDnsQuery: boolean;
  pathIsDnsJson: boolean;
};

export function parseRequest(request: Request): ParsedRequest {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const hasDnsParam = url.searchParams.has("dns");
  const dnsParam = url.searchParams.get("dns");
  const hasNameParam = url.searchParams.has("name");
  const nameParam = url.searchParams.get("name");
  const path = url.pathname;
  const pathIsDnsQuery = path.endsWith("/dns-query");
  const pathIsDnsJson = path.endsWith("/dns-json") || path.endsWith("/resolve");
  return {
    method: request.method,
    contentType,
    hasDnsParam,
    dnsParam,
    hasNameParam,
    nameParam,
    path,
    pathIsDnsQuery,
    pathIsDnsJson,
  };
}

/**
 * CORS (Cross-Origin Resource Sharing) support for DoH worker
 * Enables browser-based DoH clients to make requests
 */

/**
 * Adds CORS headers to a response
 * @param response The response to add CORS headers to
 * @param origin Optional origin to allow (defaults to *)
 * @returns New response with CORS headers added
 */
export function addCorsHeaders(response: Response, origin: string = "*"): Response {
  const headers = new Headers(response.headers);
  
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handles OPTIONS preflight request for CORS
 * @param origin Optional origin to allow (defaults to *)
 * @returns Response for OPTIONS request
 */
export function handleCorsPreflight(origin: string = "*"): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}


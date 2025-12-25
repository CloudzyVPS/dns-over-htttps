// Centralized error and response helpers

// Returns a 400 Bad Request error in JSON, as per RFC 7807 (problem details for HTTP APIs)
export function badRequest(msg: string): Response {
  return new Response(JSON.stringify({
    error: "Bad Request",
    message: msg,
    code: 400
  }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}


// Returns a 500 Internal Server Error in JSON, as per RFC 7807
export function internalError(msg: string): Response {
  return new Response(JSON.stringify({
    error: "Internal Server Error",
    message: msg,
    code: 500
  }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}


// Returns a 404 Not Found error, plain text
export function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}


// Health check endpoint response (non-standard, for monitoring)
export function healthResponse(): Response {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
}


// Help endpoint, describes supported DoH endpoints (RFC 8484, Cloudflare/Google style)
export function helpResponse(): Response {
  return new Response(
    `DoH Worker\n- Wire-format: GET/POST /dns-query (RFC8484)\n- JSON: GET /dns-json or /resolve ?name=mail.cloudzy.com&type=A \n- PTR (reverse) example: resolve mail.cloudzy.com then query PTR for its IP (see README)\n- Health: GET /health`,
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

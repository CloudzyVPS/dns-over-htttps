// Centralized error and response helpers
export function badRequest(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

export function internalError(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

export function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

export function healthResponse(): Response {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    headers: { "content-type": "application/json" },
  });
}

export function helpResponse(): Response {
  return new Response(
    `DoH Worker\n- Wire-format: GET/POST /dns-query (RFC8484)\n- JSON: GET /dns-json or /resolve ?name=mail.cloudzy.com&type=A (e.g., https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=A)\n- PTR (reverse) example: resolve mail.cloudzy.com then query PTR for its IP (see README)\n- Health: GET /health`,
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

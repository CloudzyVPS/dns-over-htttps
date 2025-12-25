export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // If UPSTREAM env var is set and non-empty, prefer it; otherwise use a built-in list of well-known DoH upstreams
    const DEFAULT_UPSTREAMS = [
      "https://cloudflare-dns.com/dns-query",
      "https://1.1.1.1/dns-query",
      "https://dns.google/dns-query",
      "https://dns.quad9.net/dns-query",
    ];
    const upstreams = env.UPSTREAM && env.UPSTREAM.trim() !== "" ? [env.UPSTREAM] : DEFAULT_UPSTREAMS;

    // Try sequential upstreams and return the first successful (non-5xx) response. If all fail, throw the last error.
    async function tryUpstreams(fn: (upstream: string) => Promise<Response>): Promise<Response> {
      let lastErr: any = new Error("No upstreams available");
      for (const up of upstreams) {
        try {
          const resp = await fn(up);
          // For server errors, try the next upstream. For client errors (4xx) or success (2xx/3xx), return immediately.
          if (resp.status >= 500) {
            lastErr = new Error(`upstream ${up} returned ${resp.status}`);
            continue;
          }
          return resp;
        } catch (e) {
          lastErr = e;
          continue;
        }
      }
      throw lastErr;
    }

    // Decide mode by content-type or path
    const ct = request.headers.get("content-type")?.toLowerCase() ?? "";
    const isWire = ct.includes("application/dns-message") || url.pathname.endsWith("/dns-query");
    const isJson = url.pathname.endsWith("/dns-json") || url.searchParams.has("name");

    try {
      if (request.method === "POST" && isWire) {
        // Wire-format POST
        const body = await request.arrayBuffer();
        if (body.byteLength === 0) return badRequest("Empty DNS message");

        const resp = await tryUpstreams((up) =>
          fetch(new Request(up, {
            method: "POST",
            headers: {
              "content-type": "application/dns-message",
              "accept": "application/dns-message",
            },
            body,
          }), { cf: { cacheTtl: 60, cacheEverything: false } }),
        );

        return passthroughWire(resp);
      }

      if (request.method === "GET" && isWire) {
        // Wire-format GET (RFC8484: ?dns= base64url)
        const dnsParam = url.searchParams.get("dns");
        if (!dnsParam) return badRequest("Missing dns param");

        const resp = await tryUpstreams((up) => {
          const upstreamUrl = new URL(up);
          upstreamUrl.searchParams.set("dns", dnsParam);
          return fetch(new Request(upstreamUrl.toString(), {
            headers: { "accept": "application/dns-message" },
          }), { cf: { cacheTtl: 60 } });
        });

        return passthroughWire(resp);
      }

      if (request.method === "GET" && isJson) {
        // JSON mode: ?name=example.com&type=A&cd=0&do=1
        const resp = await tryUpstreams((up) => {
          const upstreamUrl = new URL(up);
          upstreamUrl.searchParams.set("ct", "application/dns-json"); // hint
          url.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));
          return fetch(upstreamUrl.toString(), {
            headers: { "accept": "application/dns-json" },
          });
        });

        return new Response(await resp.text(), {
          status: resp.status,
          headers: {
            "content-type": "application/dns-json; charset=utf-8",
            "cache-control": resp.headers.get("cache-control") ?? "max-age=60",
          },
        });
      }

      // Simple health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
          headers: { "content-type": "application/json" },
        });
      }

      // Help page
      if (url.pathname === "/" || url.pathname === "/help") {
        return new Response(
          `DoH Worker\n- Wire-format: GET/POST /dns-query (RFC8484)\n- JSON: GET /dns-json?name=mail.cloudzy.com&type=A (e.g., https://doh.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A)\n- PTR (reverse) example: resolve mail.cloudzy.com then query PTR for its IP (see https://github.com/CloudzyVPS/dns-over-htttps)\n- Health: GET /health`,
          { headers: { "content-type": "text/plain; charset=utf-8" } },
        );
      }

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};

function badRequest(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

function passthroughWire(resp: Response): Promise<Response> {
  return resp.arrayBuffer().then((buf) =>
    new Response(buf, {
      status: resp.status,
      headers: {
        "content-type": "application/dns-message",
        "cache-control": resp.headers.get("cache-control") ?? "max-age=60",
      },
    }),
  );
}

export interface Env {
  UPSTREAM?: string; // override upstream if needed
}

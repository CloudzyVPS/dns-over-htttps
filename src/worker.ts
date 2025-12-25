export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // RFC 8484 Section 4.1: DoH servers SHOULD support multiple upstream resolvers for redundancy
    // If UPSTREAM env var is set and non-empty, prefer it; otherwise use a built-in list of well-known DoH upstreams
    // All upstreams use RFC 8484 compliant /dns-query endpoints for wire-format queries
    // DRY: Each upstream includes provider, base, wire path, json path
    const DEFAULT_UPSTREAMS = [
      {
        provider: "cloudflare",
        base: "https://cloudflare-dns.com",
        wirePath: "/dns-query",
        jsonPath: "/dns-json"
      },
      {
        provider: "cloudflare-alt",
        base: "https://1.1.1.1",
        wirePath: "/dns-query",
        jsonPath: "/dns-json"
      },
      {
        provider: "google",
        base: "https://dns.google",
        wirePath: "/dns-query",
        jsonPath: "/resolve"
      },
      {
        provider: "quad9",
        base: "https://dns.quad9.net",
        wirePath: "/dns-query",
        jsonPath: "/dns-query", // quad9 supports JSON via ct param
        jsonCt: "application/dns-json"
      }
    ];
    // If UPSTREAM is set, use it as a custom provider
    const upstreams = env.UPSTREAM && env.UPSTREAM.trim() !== ""
      ? [{ provider: "custom", base: env.UPSTREAM, wirePath: "/dns-query", jsonPath: "/dns-query" }]
      : DEFAULT_UPSTREAMS;

    // RFC 7231 Section 6.6: HTTP status codes 5xx indicate server errors
    // RFC 8484 Section 6: DoH clients SHOULD implement fallback mechanisms
    // Try sequential upstreams and return the first successful (non-5xx) response. If all fail, throw the last error.
    async function tryUpstreams(fn: (upstream: string) => Promise<Response>): Promise<Response> {
      let lastErr: any = new Error("No upstreams available");
      for (const up of upstreams) {
        try {
          const resp = await fn(up);
          // RFC 7231 Section 6: Status codes >= 500 are server errors, should retry with next upstream
          // RFC 7231 Section 6: Status codes 2xx/3xx/4xx are client errors or success, return immediately
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

    // RFC 8484 Section 4.1: DoH requests can use either wire-format (application/dns-message) or JSON format
    // RFC 7231 Section 3.1.1.5: Content-Type header indicates the media type of the request body
    // Decide mode by content-type, path, or query params. We accept both `dns` (wire-format base64url)
    // and `name` (JSON-style) query params to be compatible with common DoH providers.
    const ct = request.headers.get("content-type")?.toLowerCase() ?? "";

    // RFC 8484 Section 4.1.1: GET requests use ?dns= parameter containing base64url-encoded DNS message
    // Helper checks for RFC 8484 wire-format GET parameter
    const hasDnsParam = url.searchParams.has("dns");
    const dnsParam = url.searchParams.get("dns");

    // Google JSON API style: uses ?name= parameter (non-standard, Google-specific format)
    // Helper checks for Google-style JSON query parameter
    const hasNameParam = url.searchParams.has("name");
    const nameParam = url.searchParams.get("name");

    // RFC 8484 Section 4.1: Standard DoH endpoint path is /dns-query
    // Path hints for RFC 8484 wire-format endpoint
    const path = url.pathname;
    const pathIsDnsQuery = path.endsWith("/dns-query");

    // Cloudflare JSON API: uses /dns-json endpoint (Cloudflare-specific, non-RFC 8484)
    // Google JSON API: uses /resolve endpoint (Google-specific, non-RFC 8484)
    // Path hints for JSON-format endpoints (provider-specific extensions)
    const pathIsDnsJson = path.endsWith("/dns-json") || path.endsWith("/resolve");

    // Upstream type for endpoint info
    type Upstream = {
      provider: string;
      base: string;
      wirePath: string;
      jsonPath: string;
      jsonCt?: string;
    };
    // DRY: Helper to build upstream URL for wire or JSON
    function buildUpstreamUrl(upstream: Upstream, type: "wire" | "json"): URL {
      const url = new URL(upstream.base);
      if (type === "wire") {
        url.pathname = upstream.wirePath;
      } else {
        url.pathname = upstream.jsonPath;
        if (upstream.jsonCt) url.searchParams.set("ct", upstream.jsonCt);
      }
      return url;
    }

    try {
      // Wire-format POST
      if (request.method === "POST" && ct.includes("application/dns-message")) {
        const body = await request.arrayBuffer();
        if (body.byteLength === 0) return badRequest("Empty DNS message");
        const resp = await tryUpstreams((upstream) =>
          fetch(new Request(buildUpstreamUrl(upstream, "wire"), {
            method: "POST",
            headers: {
              "content-type": "application/dns-message",
              "accept": "application/dns-message",
            },
            body,
          }), { cf: { cacheTtl: 60, cacheEverything: false } })
        );
        return passthroughWire(resp);
      }

      // Wire-format GET
      if (request.method === "GET" && (pathIsDnsQuery || hasDnsParam)) {
        const dnsValue = dnsParam;
        if (!dnsValue) return badRequest("Missing dns param");
        const resp = await tryUpstreams((upstream) => {
          const url = buildUpstreamUrl(upstream, "wire");
          url.searchParams.set("dns", dnsValue);
          return fetch(new Request(url.toString(), {
            headers: { "accept": "application/dns-message" },
          }), { cf: { cacheTtl: 60 } });
        });
        return passthroughWire(resp);
      }

      // JSON GET
      if (request.method === "GET" && (pathIsDnsJson || hasNameParam)) {
        const nameValue = nameParam;
        if (!nameValue) return badRequest("Missing name param");
        const resp = await tryUpstreams((upstream) => {
          const url = buildUpstreamUrl(upstream, "json");
          // Copy all query params
          url.searchParams.forEach((v, k) => url.searchParams.delete(k));
          // Copy from original request
          (new URL(request.url)).searchParams.forEach((v, k) => url.searchParams.set(k, v));
          return fetch(url.toString(), {
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

      // Health check endpoint (non-RFC 8484, service-specific)
      // RFC 7231 Section 4.3.1: GET method for health checks
      // RFC 8259: JSON format for health status response
      // Simple health check
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
          headers: { "content-type": "application/json" },  // RFC 7231 Section 3.1.1.5: Content-Type
        });
      }

      // Help/documentation endpoint (non-RFC 8484, service-specific)
      // RFC 7231 Section 4.3.1: GET method for retrieving documentation
      // RFC 2046 Section 4.1: text/plain content-type
      // Help page
      if (url.pathname === "/" || url.pathname === "/help") {
        return new Response(
          `DoH Worker\n- Wire-format: GET/POST /dns-query (RFC8484)\n- JSON: GET /dns-json or /resolve ?name=mail.cloudzy.com&type=A (e.g., https://dns.cloudzy.com/resolve?name=mail.cloudzy.com&type=A)\n- PTR (reverse) example: resolve mail.cloudzy.com then query PTR for its IP (see README)\n- Health: GET /health`,
          { headers: { "content-type": "text/plain; charset=utf-8" } },  // RFC 2046 Section 4.1: text/plain
        );
      }

      // RFC 7231 Section 6.5.4: 404 Not Found for non-existent resources
      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      // RFC 7231 Section 6.6.1: 500 Internal Server Error for server-side errors
      // RFC 8259: JSON format for error responses
      return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
        status: 500,
        headers: { "content-type": "application/json" },  // RFC 7231 Section 3.1.1.5: Content-Type
      });
    }
  },
};

// RFC 7231 Section 6.5.1: 400 Bad Request for malformed client requests
// RFC 8259: JSON format for error responses
// Helper function to return RFC 7231 compliant 400 Bad Request responses
function badRequest(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,  // RFC 7231 Section 6.5.1: Bad Request status code
    headers: { "content-type": "application/json" },  // RFC 7231 Section 3.1.1.5: Content-Type
  });
}

// RFC 8484 Section 4.2: Response MUST use application/dns-message content-type for wire-format
// RFC 1035: DNS message format (wire-format binary encoding)
// RFC 7234 Section 5.2: Cache-Control header for caching directives
// Helper function to pass through RFC 8484 wire-format responses unchanged
function passthroughWire(resp: Response): Promise<Response> {
  return resp.arrayBuffer().then((buf) =>
    new Response(buf, {
      status: resp.status,  // RFC 7231 Section 6: Preserve HTTP status code
      headers: {
        "content-type": "application/dns-message",  // RFC 8484 Section 4.2: Required content-type
        "cache-control": resp.headers.get("cache-control") ?? "max-age=60",  // RFC 7234 Section 5.2: Cache-Control
      },
    }),
  );
}

export interface Env {
  UPSTREAM?: string; // override upstream if needed
}

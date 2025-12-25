export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // RFC 8484 Section 4.1: DoH servers SHOULD support multiple upstream resolvers for redundancy
    // If UPSTREAM env var is set and non-empty, prefer it; otherwise use a built-in list of well-known DoH upstreams
    // All upstreams use RFC 8484 compliant /dns-query endpoints for wire-format queries
    const DEFAULT_UPSTREAMS = [
      "https://cloudflare-dns.com/dns-query",  // Cloudflare DoH (RFC 8484 compliant)
      "https://1.1.1.1/dns-query",              // Cloudflare DoH alternative endpoint (RFC 8484 compliant)
      "https://dns.google/dns-query",           // Google DoH wire-format endpoint (RFC 8484 compliant)
      "https://dns.quad9.net/dns-query",       // Quad9 DoH (RFC 8484 compliant)
    ];
    const upstreams = env.UPSTREAM && env.UPSTREAM.trim() !== "" ? [env.UPSTREAM] : DEFAULT_UPSTREAMS;

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

    try {
      // RFC 8484 Section 4.1.1: POST requests MUST use application/dns-message content-type
      // RFC 1035: DNS message format (wire-format binary encoding)
      // RFC 7231 Section 4.3.3: POST method for sending request body
      // This handles RFC 8484 compliant POST wire-format requests (Cloudflare-style, standard DoH)
      if (request.method === "POST" && ct.includes("application/dns-message")) {
        // RFC 8484 Section 4.1.1: POST body contains DNS message in wire format (RFC 1035)
        // Wire-format POST - RFC 8484 standard method
        const body = await request.arrayBuffer();
        // RFC 7231 Section 6.5.1: 400 Bad Request for malformed requests
        // RFC 8484 Section 6: Empty DNS messages are invalid
        if (body.byteLength === 0) return badRequest("Empty DNS message");

        // RFC 8484 Section 4.1: Forward to upstream DoH resolver
        // RFC 8484 Section 4.1.1: POST requests MUST use application/dns-message content-type
        // RFC 7231 Section 5.3.2: Accept header indicates response media type preference
        const resp = await tryUpstreams((up) =>
          fetch(new Request(up, {
            method: "POST",
            headers: {
              "content-type": "application/dns-message",  // RFC 8484 Section 4.1.1: Required content-type
              "accept": "application/dns-message",        // RFC 7231 Section 5.3.2: Accept header
            },
            body,  // RFC 1035: DNS wire-format message
          }), { cf: { cacheTtl: 60, cacheEverything: false } }),
        );

        // RFC 8484 Section 4.2: Response MUST be application/dns-message for wire-format
        // RFC 7234 Section 5.2: Cache-Control header for caching directives
        return passthroughWire(resp);
      }

      // RFC 8484 Section 4.1.1: GET requests use ?dns= parameter with base64url-encoded DNS message
      // RFC 4648 Section 5: base64url encoding (URL-safe base64)
      // RFC 8484 Section 4.1: Standard endpoint path is /dns-query
      // This handles RFC 8484 compliant GET wire-format requests (Cloudflare-style, standard DoH)
      // Wire-format GET (RFC8484: ?dns= base64url)
      if (request.method === "GET" && (pathIsDnsQuery || hasDnsParam)) {
        // RFC 8484 Section 4.1.1: GET requests require ?dns= parameter with base64url-encoded message
        // RFC 8484 Section 4.1.1: Wire-format GET requests MUST use ?dns= parameter (base64url-encoded DNS message)
        // Note: This handler ONLY accepts ?dns= parameter. For JSON format with ?name= parameter, use /resolve or /dns-json endpoints.
        const dnsValue = dnsParam;
        // RFC 7231 Section 6.5.1: 400 Bad Request when required parameter is missing
        // RFC 8484 Section 6: Missing dns parameter is invalid for wire-format GET
        if (!dnsValue) return badRequest("Missing dns param");

        // RFC 8484 Section 4.1: Forward to upstream DoH resolver
        // RFC 8484 Section 4.1.1: GET requests forward ?dns= parameter unchanged
        const resp = await tryUpstreams((up) => {
          const upstreamUrl = new URL(up);
          // RFC 8484 Section 4.1.1: Forward dns parameter (base64url-encoded DNS message)
          upstreamUrl.searchParams.set("dns", dnsValue);
          return fetch(new Request(upstreamUrl.toString(), {
            headers: { "accept": "application/dns-message" },  // RFC 7231 Section 5.3.2: Accept header
          }), { cf: { cacheTtl: 60 } });  // RFC 7234 Section 5.2: Cache-Control
        });

        // RFC 8484 Section 4.2: Response MUST be application/dns-message for wire-format
        return passthroughWire(resp);
      }

      // JSON mode: Non-standard extension, not part of RFC 8484
      // Google JSON API: Uses /resolve endpoint with ?name=example.com&type=A parameters
      // Cloudflare JSON API: Uses /dns-json endpoint with ?name=example.com&type=A parameters
      // RFC 1035 Section 3.2.2: DNS record types (A, AAAA, MX, etc.)
      // RFC 7231 Section 4.3.1: GET method for retrieving resources
      // This handles provider-specific JSON format requests (Google-style and Cloudflare-style)
      // JSON mode: ?name=example.com&type=A&cd=0&do=1
      if (request.method === "GET" && (pathIsDnsJson || hasNameParam)) {
        // Google JSON API: Requires ?name= parameter (non-RFC 8484, Google-specific)
        // Cloudflare JSON API: Requires ?name= parameter (non-RFC 8484, Cloudflare-specific)
        const nameValue = nameParam;
        // RFC 7231 Section 6.5.1: 400 Bad Request when required parameter is missing
        // Missing name parameter is invalid for JSON format requests
        if (!nameValue) return badRequest("Missing name param");

        // Forward JSON requests to appropriate upstream endpoints based on provider
        const resp = await tryUpstreams((up) => {
          const upstreamUrl = new URL(up);
          // Convert upstream URL to appropriate JSON endpoint:
          // - Google uses /resolve endpoint (Google-specific, non-RFC 8484)
          // - Cloudflare uses /dns-json endpoint (Cloudflare-specific, non-RFC 8484)
          // - Quad9 uses /dns-query with ct parameter (provider-specific extension)
          const upstreamHost = upstreamUrl.hostname;
          if (upstreamHost.includes("dns.google") || upstreamHost.includes("google")) {
            // Google-style: use /resolve endpoint (Google JSON API, non-standard)
            // Google's JSON API documentation: https://developers.google.com/speed/public-dns/docs/doh/json
            upstreamUrl.pathname = "/resolve";
          } else if (upstreamHost.includes("cloudflare") || upstreamHost === "1.1.1.1") {
            // Cloudflare-style: use /dns-json endpoint (Cloudflare JSON API, non-standard)
            // Cloudflare's JSON API documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/
            upstreamUrl.pathname = "/dns-json";
          } else {
            // For other providers (e.g., Quad9), try /dns-query with ct parameter
            // Some providers support JSON via content-type negotiation (non-standard extension)
            upstreamUrl.searchParams.set("ct", "application/dns-json");
          }
          // RFC 3986 Section 3.4: Query component contains name-value pairs
          // RFC 1035 Section 3.2.2: DNS query parameters (name, type, cd, do, etc.)
          // copy through original query params (name/type/etc) to upstream
          url.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));
          return fetch(upstreamUrl.toString(), {
            headers: { "accept": "application/dns-json" },  // RFC 7231 Section 5.3.2: Accept header for JSON
          });
        });

        // RFC 7231 Section 3.1.1.5: Content-Type header indicates JSON response format
        // RFC 8259: JSON format specification
        // RFC 7234 Section 5.2: Cache-Control header for caching directives
        return new Response(await resp.text(), {
          status: resp.status,  // RFC 7231 Section 6: HTTP status codes
          headers: {
            "content-type": "application/dns-json; charset=utf-8",  // JSON content-type (non-RFC 8484)
            "cache-control": resp.headers.get("cache-control") ?? "max-age=60",  // RFC 7234 Section 5.2
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

import { getUpstreams, buildUpstreamUrl, Upstream } from "./upstreams";
import { passthroughWire } from "./passthroughWire";
import { parseRequest, ParsedRequest } from "./requestParser";
import { badRequest, internalError, notFound, healthResponse, helpResponse } from "./errorHandler";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const req: ParsedRequest = parseRequest(request);
    const upstreams: Upstream[] = getUpstreams(env);

    async function tryUpstreams(fn: (upstream: Upstream) => Promise<Response>): Promise<Response> {
      let lastErr: any = new Error("No upstreams available");
      for (const up of upstreams) {
        try {
          const resp = await fn(up);
          if (resp.status >= 500) {
            lastErr = new Error(`upstream ${up.provider} returned ${resp.status}`);
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

    try {
      // Wire-format POST (Cloudflare/Google/Quad9 compatible)
      // See RFC 8484 for wire-format POST
      if (req.method === "POST" && req.contentType.includes("application/dns-message")) {
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

      // Wire-format GET (Cloudflare/Google/Quad9 compatible)
      // See RFC 8484 for wire-format GET
      if (req.method === "GET" && (req.pathIsDnsQuery || req.hasDnsParam)) {
        const dnsValue = req.dnsParam;
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

      // JSON GET (Cloudflare/dns.google style)
      // Cloudflare: /dns-json, Google: /resolve, Quad9: /dns-query?ct=application/dns-json
      if (req.method === "GET" && (req.pathIsDnsJson || req.hasNameParam)) {
        const nameValue = req.nameParam;
        if (!nameValue) return badRequest("Missing name param");
        const resp = await tryUpstreams((upstream) => {
          const url = buildUpstreamUrl(upstream, "json");
          url.searchParams.forEach((v, k) => url.searchParams.delete(k));
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

      // Health check endpoint
      if (req.path === "/health") {
        return healthResponse();
      }

      // Help/documentation endpoint
      if (req.path === "/" || req.path === "/help") {
        return helpResponse();
      }

      return notFound();
    } catch (err: any) {
      return internalError(err?.message ?? "Internal error");
    }
  },
};

export interface Env {
  UPSTREAM?: string;
}

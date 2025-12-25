// Upstream provider definitions and helpers
export type Upstream = {
  provider: string;
  base: string;
  wirePath: string;
  jsonPath: string;
  jsonCt?: string;
};

export const DEFAULT_UPSTREAMS: Upstream[] = [
  // Cloudflare-style DNS-over-HTTPS endpoints
  {
    provider: "cloudflare",
    base: "https://cloudflare-dns.com",
    wirePath: "/dns-query",
    jsonPath: "/dns-json" // Cloudflare JSON endpoint
  },
  {
    provider: "cloudflare-alt",
    base: "https://1.1.1.1",
    wirePath: "/dns-query",
    jsonPath: "/dns-json" // Cloudflare JSON endpoint (alt IP)
  },
  // Google-style DNS-over-HTTPS endpoint
  {
    provider: "google",
    base: "https://dns.google",
    wirePath: "/dns-query",
    jsonPath: "/resolve" // Google JSON endpoint
  },
  // Quad9 (Cloudflare-style JSON)
  {
    provider: "quad9",
    base: "https://dns.quad9.net",
    wirePath: "/dns-query",
    jsonPath: "/dns-query",
    jsonCt: "application/dns-json"
  }
];

export function getUpstreams(env: { UPSTREAM?: string }): Upstream[] {
  if (env.UPSTREAM && env.UPSTREAM.trim() !== "") {
    return [{ provider: "custom", base: env.UPSTREAM, wirePath: "/dns-query", jsonPath: "/dns-query" }];
  }
  return DEFAULT_UPSTREAMS;
}

export function buildUpstreamUrl(upstream: Upstream, type: "wire" | "json"): URL {
  const url = new URL(upstream.base);
  if (type === "wire") {
    url.pathname = upstream.wirePath;
  } else {
    url.pathname = upstream.jsonPath;
    if (upstream.jsonCt) url.searchParams.set("ct", upstream.jsonCt);
  }
  return url;
}

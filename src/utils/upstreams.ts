/**
 * Upstream retry logic
 * Tries multiple upstreams in sequence until one succeeds
 */

/**
 * Tries multiple upstreams in sequence until one succeeds
 */
export async function tryUpstreams(
  upstreams: string[],
  urlBuilder: (base: string) => string,
  options?: RequestInit
): Promise<Response> {
  let lastErr: Error = new Error("No upstreams available");
  for (const base of upstreams) {
    try {
      const resp = await fetch(urlBuilder(base), options);
      if (resp.status < 500) return resp;
      lastErr = new Error(`Upstream ${base} returned ${resp.status}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}


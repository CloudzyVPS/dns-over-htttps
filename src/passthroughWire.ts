// Helper function to pass through RFC 8484 wire-format responses unchanged
// See: https://datatracker.ietf.org/doc/html/rfc8484#section-4.2
export function passthroughWire(resp: Response): Promise<Response> {
  return resp.arrayBuffer().then((buf) =>
    new Response(buf, {
      status: resp.status,
      headers: {
        "content-type": "application/dns-message", // RFC 8484 section 6
        "cache-control": resp.headers.get("cache-control") ?? "max-age=60",
      },
    })
  );
}

// Helper function to pass through RFC 8484 wire-format responses unchanged
export function passthroughWire(resp: Response): Promise<Response> {
  return resp.arrayBuffer().then((buf) =>
    new Response(buf, {
      status: resp.status,
      headers: {
        "content-type": "application/dns-message",
        "cache-control": resp.headers.get("cache-control") ?? "max-age=60",
      },
    })
  );
}

import { passthroughWire } from '../passthroughWire';

test('passthroughWire returns correct content-type', async () => {
  const resp = new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { 'content-type': 'application/dns-message' },
  });
  const out = await passthroughWire(resp);
  expect(out.headers.get('content-type')).toBe('application/dns-message');
});


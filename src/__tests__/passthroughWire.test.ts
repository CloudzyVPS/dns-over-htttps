import { passthroughWire } from '../passthroughWire';

test('passthroughWire returns correct content-type', async () => {
  const resp = new Response(new Uint8Array([1,2,3]), {
    status: 200,
    headers: { 'cache-control': 'max-age=10' }
  });
  const out = await passthroughWire(resp);
  expect(out.headers.get('content-type')).toBe('application/dns-message');
  expect(out.headers.get('cache-control')).toBe('max-age=10');
  expect(out.status).toBe(200);
});

import { addCorsHeaders, handleCorsPreflight } from '../cors';

describe('addCorsHeaders', () => {
  it('adds CORS headers to response', async () => {
    const response = new Response('test', { status: 200 });
    const result = addCorsHeaders(response);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(result.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(result.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
    expect(result.status).toBe(200);
  });

  it('preserves original response body and status', async () => {
    const response = new Response('test body', { status: 404 });
    const result = addCorsHeaders(response);

    expect(await result.text()).toBe('test body');
    expect(result.status).toBe(404);
  });

  it('adds CORS headers correctly', () => {
    const response = new Response('test');
    const result = addCorsHeaders(response);

    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('handleCorsPreflight', () => {
  it('returns 204 with CORS headers', () => {
    const response = handleCorsPreflight();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Accept');
  });

  it('handles preflight request correctly', () => {
    const response = handleCorsPreflight();

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});



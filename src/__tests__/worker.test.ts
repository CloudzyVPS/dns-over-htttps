import worker from '../worker';
import { Env } from '../worker';

jest.mock('../config/upstreams');
jest.mock('../responses/cors');

import { getUpstreams } from '../config/upstreams';
import { addCorsHeaders, handleCorsPreflight } from '../responses/cors';

const mockGetUpstreams = getUpstreams as jest.MockedFunction<typeof getUpstreams>;
const mockAddCorsHeaders = addCorsHeaders as jest.MockedFunction<typeof addCorsHeaders>;
const mockHandleCorsPreflight = handleCorsPreflight as jest.MockedFunction<typeof handleCorsPreflight>;

declare const global: { fetch: jest.Mock };
declare type ExecutionContext = any;

describe('worker', () => {
  const mockEnv: Env = {};
  const mockCtx = {} as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    mockGetUpstreams.mockReturnValue(['https://test.example.com']);
    mockAddCorsHeaders.mockImplementation((resp) => resp);
    mockHandleCorsPreflight.mockReturnValue(new Response(null, { status: 204 }));
  });

  it('handles CORS preflight requests', async () => {
    const request = new Request('https://example.com/dns-query', { method: 'OPTIONS' });
    const response = await worker.fetch(request, mockEnv, mockCtx);
    
    expect(mockHandleCorsPreflight).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('adds CORS headers to all responses', async () => {
    const request = new Request('https://example.com/health');
    global.fetch.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    await worker.fetch(request, mockEnv, mockCtx);

    expect(mockAddCorsHeaders).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const request = new Request('https://example.com/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: new Uint8Array([1, 2, 3]),
    });

    global.fetch.mockRejectedValue(new Error('Network error'));

    const response = await worker.fetch(request, mockEnv, mockCtx);

    expect(response.status).toBe(500);
    expect(mockAddCorsHeaders).toHaveBeenCalled();
  });
});

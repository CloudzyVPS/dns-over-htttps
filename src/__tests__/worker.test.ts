import worker from '../worker';
import { Env } from '../worker';

// Mock dependencies
jest.mock('../upstreams');
jest.mock('../passthroughWire');
jest.mock('../cors');
jest.mock('../validation');

import { getUpstreams } from '../upstreams';
import { passthroughWire } from '../passthroughWire';
import { addCorsHeaders, handleCorsPreflight } from '../cors';
import { validateBase64Url, validateDomainName, validateBodySize } from '../validation';

// Type assertions for mocks
const mockGetUpstreams = getUpstreams as jest.MockedFunction<typeof getUpstreams>;
const mockPassthroughWire = passthroughWire as jest.MockedFunction<typeof passthroughWire>;
const mockAddCorsHeaders = addCorsHeaders as jest.MockedFunction<typeof addCorsHeaders>;
const mockHandleCorsPreflight = handleCorsPreflight as jest.MockedFunction<typeof handleCorsPreflight>;
const mockValidateBase64Url = validateBase64Url as jest.MockedFunction<typeof validateBase64Url>;
const mockValidateDomainName = validateDomainName as jest.MockedFunction<typeof validateDomainName>;
const mockValidateBodySize = validateBodySize as jest.MockedFunction<typeof validateBodySize>;

// Declare global for TypeScript
declare const global: { fetch: jest.Mock };
declare type ExecutionContext = any;

describe('worker', () => {
  const mockEnv: Env = {};
  const mockCtx = {} as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    
    // Default mock implementations
    mockGetUpstreams.mockReturnValue(['https://test.example.com']);
    mockPassthroughWire.mockResolvedValue(new Response('test', { status: 200 }));
    mockAddCorsHeaders.mockImplementation((resp) => resp);
    mockHandleCorsPreflight.mockReturnValue(new Response(null, { status: 204 }));
    mockValidateBase64Url.mockReturnValue(true);
    mockValidateDomainName.mockReturnValue(true);
    mockValidateBodySize.mockReturnValue(true);
  });

  describe('CORS preflight', () => {
    it('handles OPTIONS request', async () => {
      const request = new Request('https://example.com/dns-query', { method: 'OPTIONS' });
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(mockHandleCorsPreflight).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });
  });

  describe('wire-format POST', () => {
    it('handles valid POST request', async () => {
      const body = new Uint8Array([1, 2, 3]);
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body,
      });

      const mockUpstreamResponse = new Response(body, { status: 200 });
      global.fetch.mockResolvedValue(mockUpstreamResponse);

      await worker.fetch(request, mockEnv, mockCtx);

      expect(mockValidateBodySize).toHaveBeenCalledWith(body.byteLength);
      expect(global.fetch).toHaveBeenCalled();
      expect(mockPassthroughWire).toHaveBeenCalled();
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('rejects empty body', async () => {
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body: new Uint8Array(0),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('rejects oversized body', async () => {
      mockValidateBodySize.mockReturnValue(false);
      const body = new Uint8Array(5000);
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body,
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(413);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('wire-format GET', () => {
    it('handles valid GET request with dns param', async () => {
      const dnsParam = 'dGVzdA'; // base64url encoded
      const request = new Request(`https://example.com/dns-query?dns=${dnsParam}`);

      const mockUpstreamResponse = new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      ((global as any).fetch as jest.Mock).mockResolvedValue(mockUpstreamResponse);

      await worker.fetch(request, mockEnv, mockCtx);

      expect(mockValidateBase64Url).toHaveBeenCalledWith(dnsParam);
      expect(global.fetch).toHaveBeenCalled();
      expect(mockPassthroughWire).toHaveBeenCalled();
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('rejects missing dns param', async () => {
      const request = new Request('https://example.com/dns-query');

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('rejects invalid base64url format', async () => {
      mockValidateBase64Url.mockReturnValue(false);
      const request = new Request('https://example.com/dns-query?dns=invalid+++');

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('JSON GET', () => {
    it('handles valid JSON request', async () => {
      const request = new Request('https://example.com/resolve?name=example.com&type=A');

      const mockUpstreamResponse = new Response('{"Answer":[]}', {
        status: 200,
        headers: { 'content-type': 'application/dns-json' },
      });
      ((global as any).fetch as jest.Mock).mockResolvedValue(mockUpstreamResponse);

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(mockValidateDomainName).toHaveBeenCalledWith('example.com');
      expect(global.fetch).toHaveBeenCalled();
      expect(mockAddCorsHeaders).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('rejects missing name param', async () => {
      const request = new Request('https://example.com/resolve?type=A');

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('rejects invalid domain name', async () => {
      mockValidateDomainName.mockReturnValue(false);
      const request = new Request('https://example.com/resolve?name=invalid..domain');

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('health endpoint', () => {
    it('handles health check request', async () => {
      const request = new Request('https://example.com/health');
      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('help endpoint', () => {
    it('handles root path', async () => {
      const request = new Request('https://example.com/');
      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });

    it('handles /help path', async () => {
      const request = new Request('https://example.com/help');
      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('not found', () => {
    it('returns 404 for unknown paths', async () => {
      const request = new Request('https://example.com/unknown');
      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(404);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('upstream fallback', () => {
    it('tries next upstream on 500 error', async () => {
      mockGetUpstreams.mockReturnValue([
        'https://first.com',
        'https://second.com',
      ]);

      const body = new Uint8Array([1, 2, 3]);
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body,
      });

      const errorResponse = new Response('Error', { status: 500 });
      const successResponse = new Response(body, { status: 200 });

      global.fetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse);

      await worker.fetch(request, mockEnv, mockCtx);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockPassthroughWire).toHaveBeenCalledWith(successResponse);
    });

    it('throws error if all upstreams fail', async () => {
      mockGetUpstreams.mockReturnValue([
        'https://first.com',
      ]);

      const body = new Uint8Array([1, 2, 3]);
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body,
      });

      const errorResponse = new Response('Error', { status: 500 });
      global.fetch.mockResolvedValue(errorResponse);

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
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

    it('handles non-Error exceptions', async () => {
      const request = new Request('https://example.com/dns-query', {
        method: 'POST',
        headers: { 'content-type': 'application/dns-message' },
        body: new Uint8Array([1, 2, 3]),
      });

      global.fetch.mockRejectedValue('String error');

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      expect(mockAddCorsHeaders).toHaveBeenCalled();
    });
  });
});


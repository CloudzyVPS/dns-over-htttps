import { handleWirePost } from '../../handlers/wirePost';
import { ParsedRequest } from '../../../utils/requestParser';

jest.mock('../../../utils/passthroughWire');
jest.mock('../../../utils/validation');
jest.mock('../../../responses/errorHandler');

import { passthroughWire } from '../../../utils/passthroughWire';
import { validateBodySize } from '../../../utils/validation';
import { badRequest, payloadTooLarge } from '../../../responses/errorHandler';

const mockPassthroughWire = passthroughWire as jest.MockedFunction<typeof passthroughWire>;
const mockValidateBodySize = validateBodySize as jest.MockedFunction<typeof validateBodySize>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;
const mockPayloadTooLarge = payloadTooLarge as jest.MockedFunction<typeof payloadTooLarge>;

declare const global: { fetch: jest.Mock };

describe('handleWirePost', () => {
  const upstreams = ['https://test.example.com'];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    mockValidateBodySize.mockReturnValue(true);
    mockPassthroughWire.mockResolvedValue(new Response('test', { status: 200 }));
  });

  it('handles valid POST request', async () => {
    const req: ParsedRequest = {
      method: 'POST',
      contentType: 'application/dns-message',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const body = new Uint8Array([1, 2, 3]);
    const request = new Request('https://example.com/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body,
    });

    global.fetch.mockResolvedValue(new Response(body, { status: 200 }));

    await handleWirePost(req, request, upstreams);

    expect(mockValidateBodySize).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(mockPassthroughWire).toHaveBeenCalled();
  });

  it('returns null for non-POST requests', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/dns-query');

    const result = await handleWirePost(req, request, upstreams);
    expect(result).toBeNull();
  });

  it('rejects empty body', async () => {
    const req: ParsedRequest = {
      method: 'POST',
      contentType: 'application/dns-message',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: new Uint8Array(0),
    });

    mockBadRequest.mockReturnValue(new Response('error', { status: 400 }));

    await handleWirePost(req, request, upstreams);
    expect(mockBadRequest).toHaveBeenCalledWith('Empty DNS message body');
  });

  it('rejects oversized body', async () => {
    const req: ParsedRequest = {
      method: 'POST',
      contentType: 'application/dns-message',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    mockValidateBodySize.mockReturnValue(false);
    const body = new Uint8Array(5000);
    const request = new Request('https://example.com/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body,
    });

    mockPayloadTooLarge.mockReturnValue(new Response('error', { status: 413 }));

    await handleWirePost(req, request, upstreams);
    expect(mockPayloadTooLarge).toHaveBeenCalled();
  });
});



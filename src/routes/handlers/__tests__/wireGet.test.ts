import { handleWireGet } from '../../handlers/wireGet';
import { ParsedRequest } from '../../../utils/requestParser';

jest.mock('../../../utils/passthroughWire');
jest.mock('../../../utils/validation');
jest.mock('../../../responses/errorHandler');

import { passthroughWire } from '../../../utils/passthroughWire';
import { validateBase64Url } from '../../../utils/validation';
import { badRequest } from '../../../responses/errorHandler';

const mockPassthroughWire = passthroughWire as jest.MockedFunction<typeof passthroughWire>;
const mockValidateBase64Url = validateBase64Url as jest.MockedFunction<typeof validateBase64Url>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;

declare const global: { fetch: jest.Mock };

describe('handleWireGet', () => {
  const upstreams = ['https://test.example.com'];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    mockValidateBase64Url.mockReturnValue(true);
    mockPassthroughWire.mockResolvedValue(new Response('test', { status: 200 }));
  });

  it('handles valid GET request with dns param', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: 'dGVzdA',
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/dns-query?dns=dGVzdA');

    global.fetch.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    await handleWireGet(req, request, upstreams);

    expect(mockValidateBase64Url).toHaveBeenCalledWith('dGVzdA');
    expect(global.fetch).toHaveBeenCalled();
    expect(mockPassthroughWire).toHaveBeenCalled();
  });

  it('returns null for non-matching requests', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/other',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/other');

    const result = await handleWireGet(req, request, upstreams);
    expect(result).toBeNull();
  });

  it('rejects missing dns param', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/dns-query');

    mockBadRequest.mockReturnValue(new Response('error', { status: 400 }));

    await handleWireGet(req, request, upstreams);
    expect(mockBadRequest).toHaveBeenCalledWith("Missing required 'dns' query parameter");
  });

  it('rejects invalid base64url format', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: 'invalid+++',
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    mockValidateBase64Url.mockReturnValue(false);
    const request = new Request('https://example.com/dns-query?dns=invalid+++');

    mockBadRequest.mockReturnValue(new Response('error', { status: 400 }));

    await handleWireGet(req, request, upstreams);
    expect(mockBadRequest).toHaveBeenCalled();
  });
});



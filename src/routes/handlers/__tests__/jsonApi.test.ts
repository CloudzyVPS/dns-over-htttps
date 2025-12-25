import { handleJsonApi } from '../../handlers/jsonApi';
import { ParsedRequest } from '../../../utils/requestParser';

jest.mock('../../../utils/validation');
jest.mock('../../../responses/errorHandler');

import { validateDomainName } from '../../../utils/validation';
import { badRequest } from '../../../responses/errorHandler';

const mockValidateDomainName = validateDomainName as jest.MockedFunction<typeof validateDomainName>;
const mockBadRequest = badRequest as jest.MockedFunction<typeof badRequest>;

declare const global: { fetch: jest.Mock };

describe('handleJsonApi', () => {
  const upstreams = ['https://test.example.com'];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    mockValidateDomainName.mockReturnValue(true);
  });

  it('handles valid JSON request', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: 'example.com',
      path: '/resolve',
      isJsonApi: true,
    };
    const request = new Request('https://example.com/resolve?name=example.com&type=A');

    global.fetch.mockResolvedValue(new Response('{"Answer":[]}', {
      status: 200,
      headers: { 'content-type': 'application/dns-json' },
    }));

    const result = await handleJsonApi(req, request, upstreams);

    expect(mockValidateDomainName).toHaveBeenCalledWith('example.com');
    expect(global.fetch).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(200);
  });

  it('returns null for non-JSON API requests', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/dns-query',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/dns-query');

    const result = await handleJsonApi(req, request, upstreams);
    expect(result).toBeNull();
  });

  it('rejects missing name param', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/resolve',
      isJsonApi: true,
    };
    const request = new Request('https://example.com/resolve?type=A');

    mockBadRequest.mockReturnValue(new Response('error', { status: 400 }));

    await handleJsonApi(req, request, upstreams);
    expect(mockBadRequest).toHaveBeenCalledWith("Missing required 'name' query parameter");
  });

  it('rejects invalid domain name', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: 'invalid..domain',
      path: '/resolve',
      isJsonApi: true,
    };
    mockValidateDomainName.mockReturnValue(false);
    const request = new Request('https://example.com/resolve?name=invalid..domain');

    mockBadRequest.mockReturnValue(new Response('error', { status: 400 }));

    await handleJsonApi(req, request, upstreams);
    expect(mockBadRequest).toHaveBeenCalled();
  });
});


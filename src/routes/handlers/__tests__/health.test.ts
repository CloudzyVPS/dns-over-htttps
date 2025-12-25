import { handleHealth } from '../../handlers/health';
import { ParsedRequest } from '../../../utils/requestParser';
import { healthResponse } from '../../../responses/errorHandler';

jest.mock('../../../responses/errorHandler');

const mockHealthResponse = healthResponse as jest.MockedFunction<typeof healthResponse>;

describe('handleHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHealthResponse.mockReturnValue(new Response('{"ok":true}', { status: 200 }));
  });

  it('handles health check request', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/health',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/health');

    const result = await handleHealth(req, request, []);

    expect(mockHealthResponse).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('returns null for non-health paths', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/other',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/other');

    const result = await handleHealth(req, request, []);
    expect(result).toBeNull();
  });
});


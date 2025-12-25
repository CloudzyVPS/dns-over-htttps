import { route } from '../index';
import { ParsedRequest } from '../../utils/requestParser';
import { notFound } from '../../responses/errorHandler';

jest.mock('../handlers/jsonApi');
jest.mock('../../responses/errorHandler');

import { handleJsonApi } from '../handlers/jsonApi';

const mockHandleJsonApi = handleJsonApi as jest.MockedFunction<typeof handleJsonApi>;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe('route', () => {
  const upstreams = ['https://test.example.com'];
  const request = new Request('https://example.com/resolve?name=example.com');

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotFound.mockReturnValue(new Response('Not Found', { status: 404 }));
  });

  it('returns matching handler response', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: 'example.com',
      path: '/resolve',
      isJsonApi: true,
    };

    const mockResponse = new Response('test', { status: 200 });
    mockHandleJsonApi.mockResolvedValue(mockResponse);

    const result = await route(req, request, upstreams);

    expect(result).toBe(mockResponse);
    expect(mockHandleJsonApi).toHaveBeenCalled();
  });

  it('returns notFound when no handler matches', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/unknown',
      isJsonApi: false,
    };

    const result = await route(req, request, upstreams);

    expect(mockNotFound).toHaveBeenCalled();
    expect(result.status).toBe(404);
  });
});


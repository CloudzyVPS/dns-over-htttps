import { handleHelp } from '../../handlers/help';
import { ParsedRequest } from '../../../utils/requestParser';
import { helpResponse } from '../../../responses/help';

jest.mock('../../../responses/help');

const mockHelpResponse = helpResponse as jest.MockedFunction<typeof helpResponse>;

describe('handleHelp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHelpResponse.mockReturnValue(new Response('help text', { status: 200 }));
  });

  it('handles root path', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/');

    const result = await handleHelp(req, request, []);

    expect(mockHelpResponse).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('handles /help path', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/help',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/help');

    const result = await handleHelp(req, request, []);

    expect(mockHelpResponse).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('returns null for other paths', async () => {
    const req: ParsedRequest = {
      method: 'GET',
      contentType: '',
      dnsParam: null,
      nameParam: null,
      path: '/other',
      isJsonApi: false,
    };
    const request = new Request('https://example.com/other');

    const result = await handleHelp(req, request, []);
    expect(result).toBeNull();
  });
});


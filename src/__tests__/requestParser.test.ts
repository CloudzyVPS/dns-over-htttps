import { parseRequest } from '../requestParser';

describe('parseRequest', () => {
  it('extracts all fields', () => {
    const req = new Request('https://x.com/dns-query?dns=abc&name=def', {
      method: 'GET',
      headers: { 'content-type': 'application/dns-message' }
    });
    const parsed = parseRequest(req);
    expect(parsed.method).toBe('GET');
    expect(parsed.contentType).toBe('application/dns-message');
    expect(parsed.dnsParam).toBe('abc');
    expect(parsed.nameParam).toBe('def');
    expect(parsed.path).toBe('/dns-query');
  });

  it('detects Cloudflare style JSON API', () => {
    const req = new Request('https://x.com/dns-json?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.nameParam).toBe('example.com');
  });

  it('detects Google style JSON API', () => {
    const req = new Request('https://x.com/resolve?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.nameParam).toBe('example.com');
  });

  it('detects Quad9 style JSON API with ct parameter', () => {
    const req = new Request('https://x.com/dns-query?name=example.com&type=A&ct=application/dns-json');
    const parsed = parseRequest(req);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.nameParam).toBe('example.com');
  });

  it('detects Quad9 style JSON API without ct parameter', () => {
    const req = new Request('https://x.com/dns-query?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.nameParam).toBe('example.com');
  });

  it('detects wire format GET', () => {
    const req = new Request('https://x.com/dns-query?dns=abc123');
    const parsed = parseRequest(req);
    expect(parsed.dnsParam).toBe('abc123');
    expect(parsed.isJsonApi).toBe(false);
  });

  it('detects wire format POST', () => {
    const req = new Request('https://x.com/dns-query', {
      method: 'POST',
      headers: { 'content-type': 'application/dns-message' },
      body: new Uint8Array([1, 2, 3])
    });
    const parsed = parseRequest(req);
    expect(parsed.method).toBe('POST');
    expect(parsed.contentType).toBe('application/dns-message');
    expect(parsed.path).toBe('/dns-query');
  });
});

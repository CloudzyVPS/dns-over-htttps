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
    expect(parsed.hasDnsParam).toBe(true);
    expect(parsed.dnsParam).toBe('abc');
    expect(parsed.hasNameParam).toBe(true);
    expect(parsed.nameParam).toBe('def');
    expect(parsed.pathIsDnsQuery).toBe(true);
    expect(parsed.pathIsDnsJson).toBe(false);
  });

  it('detects Cloudflare style JSON API', () => {
    const req = new Request('https://x.com/dns-json?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.pathIsDnsJson).toBe(true);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.hasNameParam).toBe(true);
  });

  it('detects Google style JSON API', () => {
    const req = new Request('https://x.com/resolve?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.pathIsDnsJson).toBe(true);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.hasNameParam).toBe(true);
  });

  it('detects Quad9 style JSON API with ct parameter', () => {
    const req = new Request('https://x.com/dns-query?name=example.com&type=A&ct=application/dns-json');
    const parsed = parseRequest(req);
    expect(parsed.pathIsDnsQuery).toBe(true);
    expect(parsed.hasCtParam).toBe(true);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.hasNameParam).toBe(true);
  });

  it('detects Quad9 style JSON API without ct parameter', () => {
    const req = new Request('https://x.com/dns-query?name=example.com&type=A');
    const parsed = parseRequest(req);
    expect(parsed.pathIsDnsQuery).toBe(true);
    expect(parsed.isJsonApi).toBe(true);
    expect(parsed.hasNameParam).toBe(true);
  });

  it('detects wire format GET', () => {
    const req = new Request('https://x.com/dns-query?dns=abc123');
    const parsed = parseRequest(req);
    expect(parsed.pathIsDnsQuery).toBe(true);
    expect(parsed.hasDnsParam).toBe(true);
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
    expect(parsed.pathIsDnsQuery).toBe(true);
  });
});

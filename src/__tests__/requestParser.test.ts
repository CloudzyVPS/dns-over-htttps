import { parseRequest } from '../requestParser';

test('parseRequest extracts all fields', () => {
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

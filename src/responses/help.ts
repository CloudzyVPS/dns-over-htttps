/**
 * Help and documentation endpoint content
 * Provides comprehensive documentation for the DoH service
 */

import {
  PATH_DNS_QUERY,
  PATH_DNS_JSON,
  PATH_RESOLVE,
  PATH_HEALTH,
  CONTENT_TYPE_TEXT_PLAIN,
  MAX_DNS_MESSAGE_SIZE,
  CACHE_TTL,
} from "../config/constants";

/**
 * Generates comprehensive help documentation for the DoH service
 * @returns Response with plain text documentation
 */
export function helpResponse(): Response {
  const helpText = `Cloudzy DNS-over-HTTPS (DoH) Service
==========================================

Service Endpoint: https://dns.cloudzy.com${PATH_DNS_QUERY}

SUPPORTED REQUEST FORMATS
-------------------------

1. Wire-format POST (RFC 8484)
   Method: POST
   Endpoint: ${PATH_DNS_QUERY}
   Content-Type: application/dns-message
   Body: Raw DNS message (binary)
   Max Size: ${MAX_DNS_MESSAGE_SIZE} bytes
   
   Example:
   curl -X POST \\
     -H "Content-Type: application/dns-message" \\
     --data-binary @query.bin \\
     "https://dns.cloudzy.com${PATH_DNS_QUERY}"

2. Wire-format GET (RFC 8484)
   Method: GET
   Endpoint: ${PATH_DNS_QUERY}?dns=<base64url-encoded-dns-message>
   Accept: application/dns-message
   
   Example:
   curl -H "Accept: application/dns-message" \\
     "https://dns.cloudzy.com${PATH_DNS_QUERY}?dns=BASE64URLENCODEDQUERY"

3. JSON API GET
   Supports multiple formats for compatibility:
   
   Cloudflare style:
   GET ${PATH_DNS_JSON}?name=example.com&type=A
   
   Google style:
   GET ${PATH_RESOLVE}?name=example.com&type=A
   
   Quad9 style:
   GET ${PATH_DNS_QUERY}?name=example.com&type=A&ct=application/dns-json
   
   Query Parameters:
   - name (required): Domain name to query
   - type (optional): DNS record type (A, AAAA, MX, TXT, etc.) or numeric (1-65535)
   
   Example:
   curl "https://dns.cloudzy.com${PATH_RESOLVE}?name=example.com&type=A"

4. Health Check
   Method: GET
   Endpoint: ${PATH_HEALTH}
   Returns: {"ok": true, "ts": <timestamp>}
   
   Example:
   curl "https://dns.cloudzy.com${PATH_HEALTH}"

FEATURES
--------

- RFC 8484 compliant wire format support
- Multiple JSON API format compatibility (Cloudflare, Google, Quad9)
- Automatic upstream failover (Cloudflare, Google, Quad9)
- CORS enabled for browser clients
- Input validation (base64url, domain names, request size)
- Request size limit: ${MAX_DNS_MESSAGE_SIZE} bytes
- Cache TTL: ${CACHE_TTL} seconds

UPSTREAM PROVIDERS
------------------

The service automatically fails over between multiple upstream DNS-over-HTTPS providers:
- Cloudflare (https://cloudflare-dns.com)
- Cloudflare Alternative (https://1.1.1.1)
- Google (https://dns.google)
- Quad9 (https://dns.quad9.net)

If one upstream fails, the service automatically tries the next one in sequence.

ERROR RESPONSES
---------------

Error responses follow RFC 7807 format:
{
  "error": "Error Type",
  "message": "Descriptive error message",
  "code": <status_code>
}

HTTP Status Codes:
- 400 Bad Request: Invalid request format or missing parameters
- 413 Payload Too Large: Request body exceeds ${MAX_DNS_MESSAGE_SIZE} bytes
- 404 Not Found: Endpoint not found
- 500 Internal Server Error: Server error or all upstreams failed

CORS SUPPORT
------------

All endpoints support Cross-Origin Resource Sharing:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Accept
- Access-Control-Max-Age: 86400 (24 hours)

OPTIONS preflight requests are automatically handled.

VALIDATION
----------

The service validates all incoming requests:
- DNS parameter: Must be valid base64url encoding (RFC 4648 Section 5)
- Domain names: Must follow valid domain name format (RFC 1035)
- Request size: Maximum ${MAX_DNS_MESSAGE_SIZE} bytes for POST requests
- Empty requests: Rejected with appropriate error messages

EXAMPLES
--------

Look up IP address:
  https://dns.cloudzy.com${PATH_RESOLVE}?name=example.com&type=A

Check mail servers (MX records):
  https://dns.cloudzy.com${PATH_RESOLVE}?name=example.com&type=MX

Check TXT records (SPF, DKIM, etc.):
  https://dns.cloudzy.com${PATH_RESOLVE}?name=example.com&type=TXT

Reverse DNS lookup (PTR):
  https://dns.cloudzy.com${PATH_RESOLVE}?name=1.2.0.192.in-addr.arpa&type=PTR

For more information, visit: https://github.com/cloudzy/doh-worker
Or contact support: support@cloudzy.com
`;

  return new Response(helpText, {
    headers: { "content-type": CONTENT_TYPE_TEXT_PLAIN },
  });
}


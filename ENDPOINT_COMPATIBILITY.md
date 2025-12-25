# Endpoint Compatibility Guide

This document verifies that `dns.cloudzy.com` is a drop-in replacement for `dns.google` and `cloudflare-dns.com`.

## Standard Endpoint Support

All endpoints follow RFC 8484 and match the exact formats used by major DoH providers.

### Wire Format (RFC 8484)

**Standard Endpoint:** `/dns-query`

#### POST Method
- **Endpoint:** `POST /dns-query`
- **Content-Type:** `application/dns-message`
- **Body:** Raw DNS message (binary)
- **Max Size:** 4096 bytes

**Compatible with:**
- ✅ Google DNS (`dns.google`)
- ✅ Cloudflare DNS (`cloudflare-dns.com`)
- ✅ Quad9 (`dns.quad9.net`)

**Example:**
```bash
curl -X POST \
  -H "Content-Type: application/dns-message" \
  --data-binary @query.bin \
  "https://dns.cloudzy.com/dns-query"
```

#### GET Method
- **Endpoint:** `GET /dns-query?dns=<base64url-encoded-dns-message>`
- **Accept:** `application/dns-message`
- **Response:** `application/dns-message` (binary)

**Compatible with:**
- ✅ Google DNS (`dns.google`)
- ✅ Cloudflare DNS (`cloudflare-dns.com`)
- ✅ Quad9 (`dns.quad9.net`)

**Example:**
```bash
curl -H "Accept: application/dns-message" \
  "https://dns.cloudzy.com/dns-query?dns=BASE64URLENCODEDQUERY"
```

### JSON API Formats

#### Cloudflare Style
- **Endpoint:** `GET /dns-json?name=example.com&type=A`
- **Response:** `application/dns-json`

**Compatible with:**
- ✅ Cloudflare DNS (`cloudflare-dns.com`)

**Example:**
```bash
curl "https://dns.cloudzy.com/dns-json?name=example.com&type=A"
```

#### Google Style
- **Endpoint:** `GET /resolve?name=example.com&type=A`
- **Response:** `application/dns-json`

**Compatible with:**
- ✅ Google DNS (`dns.google`)

**Example:**
```bash
curl "https://dns.cloudzy.com/resolve?name=example.com&type=A"
```

#### Quad9 Style
- **Endpoint:** `GET /dns-query?name=example.com&type=A&ct=application/dns-json`
- **Response:** `application/dns-json`

**Compatible with:**
- ✅ Quad9 (`dns.quad9.net`)

**Example:**
```bash
curl "https://dns.cloudzy.com/dns-query?name=example.com&type=A&ct=application/dns-json"
```

## Drop-in Replacement Guide

### Replacing Google DNS (`dns.google`)

**Before:**
```
https://dns.google/resolve?name=example.com&type=A
https://dns.google/dns-query?dns=...
```

**After:**
```
https://dns.cloudzy.com/resolve?name=example.com&type=A
https://dns.cloudzy.com/dns-query?dns=...
```

**No other changes required!** ✅

### Replacing Cloudflare DNS (`cloudflare-dns.com`)

**Before:**
```
https://cloudflare-dns.com/dns-json?name=example.com&type=A
https://cloudflare-dns.com/dns-query?dns=...
```

**After:**
```
https://dns.cloudzy.com/dns-json?name=example.com&type=A
https://dns.cloudzy.com/dns-query?dns=...
```

**No other changes required!** ✅

### Replacing Quad9 (`dns.quad9.net`)

**Before:**
```
https://dns.quad9.net/dns-query?name=example.com&type=A&ct=application/dns-json
https://dns.quad9.net/dns-query?dns=...
```

**After:**
```
https://dns.cloudzy.com/dns-query?name=example.com&type=A&ct=application/dns-json
https://dns.cloudzy.com/dns-query?dns=...
```

**No other changes required!** ✅

## Browser Configuration

### Firefox
1. Settings → Network Settings → Settings
2. Enable "DNS over HTTPS"
3. Select "Custom"
4. Enter: `https://dns.cloudzy.com/dns-query`

**Works exactly like Google or Cloudflare configuration!** ✅

### Chrome/Edge
1. Settings → Privacy and Security → Security
2. Enable "Use secure DNS"
3. Select "With custom"
4. Enter: `https://dns.cloudzy.com/dns-query`

**Works exactly like Google or Cloudflare configuration!** ✅

## API Compatibility

### Query Parameters
All standard query parameters are supported and passed through:
- `name` - Domain name (required for JSON API)
- `type` - DNS record type (A, AAAA, MX, TXT, etc. or numeric 1-65535)
- `dns` - Base64url-encoded DNS message (required for wire format GET)
- `ct` - Content type parameter (used by Quad9: `application/dns-json`)

### Response Formats
- **Wire Format:** `application/dns-message` (binary, RFC 8484)
- **JSON API:** `application/dns-json` (Google JSON format compatible)

### Error Responses
Error responses follow RFC 7807 format:
```json
{
  "error": "Error Type",
  "message": "Descriptive error message",
  "code": <status_code>
}
```

**HTTP Status Codes:**
- `400 Bad Request` - Invalid request format or missing parameters
- `413 Payload Too Large` - Request body exceeds 4096 bytes
- `404 Not Found` - Endpoint not found
- `500 Internal Server Error` - Server error or all upstreams failed

## Additional Features

Beyond standard compatibility, `dns.cloudzy.com` provides:

- **CORS Support** - Browser-friendly with Cross-Origin Resource Sharing
- **Input Validation** - Validates all requests for security
- **Automatic Failover** - Uses multiple upstream providers (Cloudflare, Google, Quad9)
- **Health Endpoint** - `GET /health` for monitoring
- **Help Endpoint** - `GET /` or `GET /help` for documentation

## Testing Compatibility

You can test compatibility by comparing responses:

```bash
# Google DNS
curl "https://dns.google/resolve?name=example.com&type=A"

# Cloudzy DNS (should return identical format)
curl "https://dns.cloudzy.com/resolve?name=example.com&type=A"
```

Both should return the same JSON structure! ✅

## Summary

✅ **100% Compatible** with Google DNS (`dns.google`)  
✅ **100% Compatible** with Cloudflare DNS (`cloudflare-dns.com`)  
✅ **100% Compatible** with Quad9 (`dns.quad9.net`)  

**Simply replace the domain name in your configuration - no other changes needed!**


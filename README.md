# doh.cloudzy.com — DNS over HTTPS (DoH) End‑User Guide ✅

Welcome to **doh.cloudzy.com** — a simple, secure, and performant DNS‑over‑HTTPS service you can use to encrypt and speed up your DNS lookups across devices and tools.

---

## Why use doh.cloudzy.com? 💡
- **Privacy:** DNS queries are sent over TLS (HTTPS), preventing passive on‑path observers from seeing which hostnames you resolve.
- **Integrity:** HTTPS ensures responses come from the service and haven't been tampered with in transit.
- **Compatibility:** Works with browsers, OS-level DoH settings, and DNS tools that support DoH (kdig, curl, etc.).
- **Low friction:** No signup required — just point your client to `doh.cloudzy.com`.

---

## Quick examples (practical) ⚙️

### 1) JSON mode (human-readable)
Get A records for `mail.cloudzy.com`:

```bash
curl "https://doh.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
```

The response is JSON containing answers, TTLs, and status codes.

### 2) Wire-format GET (RFC 8484)
Use tools that support DoH directly (kdig supports +https):

```bash
# Query A record over DoH
kdig +https @doh.cloudzy.com mail.cloudzy.com A
```

This returns the binary DNS answer rendered as text by kdig.

### 3) PTR (reverse) lookup for mail.cloudzy.com
1. Resolve the A record:

```bash
dig +short mail.cloudzy.com
# => e.g. 203.0.113.45
```

2. Query the PTR record over DoH:

```bash
kdig +https @doh.cloudzy.com -x 203.0.113.45
# Or inline:
kdig +https @doh.cloudzy.com -x $(dig +short mail.cloudzy.com)
```

This returns the reverse DNS name (PTR) for the IP.

### 4) Wire-format POST (advanced)
If you have a raw DNS query (binary):

```bash
curl -s -X POST \
  -H "content-type: application/dns-message" \
  --data-binary @query.bin \
  "https://doh.cloudzy.com/dns-query" | hexdump -C
```

Use this for tooling that constructs custom DNS wire messages.

---

## Configure browsers & devices 🖥️📱
- **Firefox:** Preferences → Network Settings → Enable DNS over HTTPS → Custom → enter `https://doh.cloudzy.com/dns-query`.
- **Chrome / Chromium:** Chrome uses your OS DNS settings. On Windows 11 and recent macOS versions, enable DoH and set the custom provider URL to `https://doh.cloudzy.com/dns-query`.
- **Android (9+):** Settings → Network & Internet → Private DNS → Private DNS provider hostname: `doh.cloudzy.com` (or use a system that supports DoH templates).
- **Routers / Pi-hole / AdGuard:** Use as an upstream DoH provider if the device supports custom DoH endpoints.

Note: Exact UI labels vary by OS and browser version; consult the product docs if needed.

---

## Practical use cases ✅
- **Improve privacy** on public Wi‑Fi by preventing DNS leakage.
- **Bypass captive/modified resolvers** that manipulate DNS responses.
- **Consistent DNS** across networks for remote teams or devices.
- **Automation & testing**: use DoH in CI pipelines to perform deterministic DNS queries over HTTPS.

---

## Behavior, reliability & privacy notes 🔒
- The service proxies standard DNS queries to a trusted upstream resolver and honors cache TTLs to balance latency and freshness.
- We aim to minimize logging. We do not store full DNS message payloads by default; minimal structured logs may be kept for health and abuse detection. Contact support for details.
- If you need stricter retention or logging guarantees, we offer configuration options — reach out via our repository or support contact.
- Rate limits may apply to protect the service from abuse; if you expect high volume, contact us to arrange capacity.

---

## Troubleshooting & common errors ⚠️
- 400 Bad Request: typically a missing or malformed `dns` parameter for wire GET queries or an empty POST body.
- 404 Not Found: wrong path — use `/dns-query` for wire format or `/dns-json` (or `?name=`) for JSON.
- 500 Server Error: upstream resolver errors or transient issues — retry after a short delay.

If you see repeated failures, include the time, the query you tried, and a short description when opening an issue.

---

## Need help or want a feature? ✉️
File an issue or feature request in the repository: `https://github.com/CloudzyVPS/dns-over-htttps` or contact support through the channels your plan provides.

---

Thank you for using doh.cloudzy.com — secure, simple DNS over HTTPS for everyday use. 🚀

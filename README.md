# doh-worker

Minimal, audit-friendly DNS-over-HTTPS (DoH) Cloudflare Worker.

## Overview
- Supports wire-format (`application/dns-message`) and JSON (`application/dns-json`).
- Proxies requests to Cloudflare's resolver by default.

## Files
- `src/worker.ts` - Worker implementation (GET/POST `/dns-query`, GET `/dns-json`, `/health`, `/help`).
- `wrangler.toml` - Wrangler config (name, compatibility_date, UPSTREAM var).
- `tsconfig.json` - Typescript config for development.

## Local dev
Install dependencies (requires Node 18+):

```bash
npm ci
npm run dev
```

## Deploy
```bash
npm i -g wrangler
wrangler deploy
```

## Usage
JSON mode:

```bash
curl "https://doh.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
```

Wire format GET:

```bash
# generate base64url dns query and call /dns-query?dns=<base64url>
# Example using kdig to query via DoH:
kdig +https @doh.cloudzy.com mail.cloudzy.com A
```

Wire format POST (raw DNS message):

```bash
curl -s -X POST -H "content-type: application/dns-message" --data-binary @query.bin "https://doh.cloudzy.com/dns-query"
```

## PTR (reverse) lookup example
To get the PTR record for `mail.cloudzy.com` you typically:

1. Resolve its A record to get the IP:

```bash
dig +short mail.cloudzy.com
```

2. Perform a reverse (PTR) lookup of that IP over DoH (example using `kdig`):

```bash
# Replace <ip> with the IP returned in step 1
kdig +https @doh.cloudzy.com -x <ip>
# Or inline:
kdig +https @doh.cloudzy.com -x $(dig +short mail.cloudzy.com)
```

## Notes
- The Worker is stateless and respects upstream cache hints.
- To change the upstream resolver, set the `UPSTREAM` env var in `wrangler.toml` or your environment.

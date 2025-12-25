# dns.cloudzy.com — Mail Server Troubleshooting & Best Practices (mail.cloudzy.com)

This guide helps administrators and operators of the mail server at **mail.cloudzy.com** to validate DNS, deliverability, and anti‑abuse posture using `dns.cloudzy.com` (our live DNS-over-HTTPS service). It focuses on practical checks you can run from the shell, explains what the results mean, and gives remediation tips.

---

## Quick note: using dns.cloudzy.com 🔎
Our DoH endpoint is live at: **https://dns.cloudzy.com**

Examples use both the JSON DoH endpoint and `kdig`'s DoH support. Replace examples where needed if you prefer a different DoH client.

- JSON (human-readable):
  - curl "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
- Wire-format (kdig):
  - kdig +https @dns.cloudzy.com mail.cloudzy.com A

---

## Using DoH — practical examples & client configuration 🛠️
This section shows common ways to *use* DoH with tools and platforms so you can query DNS securely via `dns.cloudzy.com`.

### Curl (use system resolver over DoH)
curl supports doing DNS resolution via a DoH server for the requests it makes. This is useful for testing how a host resolves when using DoH:

```bash
# Make an HTTP request using dns.cloudzy.com for DNS resolution
curl --doh-url "https://dns.cloudzy.com/dns-query" -I https://mail.cloudzy.com

# Direct DNS lookup via curl's DOH endpoint (JSON path)
curl "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
```

Note: `--doh-url` makes curl perform normal HTTP(S) requests while resolving hostnames using the specified DoH server.

### kdig (DoH wire and reverse lookups)
kdig supports DoH via `+https` and is handy for wire-format validation and PTR checks. Use DoH when resolving both the forward and reverse names to avoid falling back to plain DNS:

```bash
# A record over DoH (wire-format)
kdig +https @dns.cloudzy.com mail.cloudzy.com A

# PTR (reverse) lookup over DoH; resolve the host to its IP using DoH and then reverse-lookup that IP via DoH
kdig +https @dns.cloudzy.com -x $(kdig +https @dns.cloudzy.com +short mail.cloudzy.com A)
```

If you prefer the JSON DoH API, use the `/dns-json` endpoint with curl as shown above.

### System & browser configuration (quick pointers)
- **Firefox:** Preferences → Network Settings → Enable DNS over HTTPS → Custom → Enter `https://dns.cloudzy.com/dns-query` and enable it.
- **Chrome / Chromium:** Chrome typically uses your OS DoH settings; on some platforms you can set a custom provider URL or use an enterprise policy to point to `https://dns.cloudzy.com/dns-query`.
- **Windows 11:** Settings → Network & Internet → Advanced network settings → DNS over HTTPS → choose Custom and enter `https://dns.cloudzy.com/dns-query`.
- **macOS:** In recent macOS versions you can configure Secure DNS through Network settings or use a profile that sets a DoH resolver pointing to `https://dns.cloudzy.com/dns-query`.
- **Android (9+):** Private DNS settings often accept a provider hostname — use `dns.cloudzy.com` or a compatible provider template if the UI allows specifying a DoH endpoint.

### How to verify traffic is using DoH
- Use `curl -v --doh-url ...` and observe DNS resolution behavior. You can also instrument the server side or use network telemetry to confirm DNS requests are not sent over plain UDP to external resolvers.
- For HTTP clients, trying an HTTP request to a hostname that resolves differently under DoH vs system DNS can quickly reveal which resolver is in use.

---

## 1) Basic DNS checks ✅
Verify the obvious first: A/AAAA, MX, and TXT records.

- A/AAAA (IP address):
  - curl "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
  - kdig +https @dns.cloudzy.com mail.cloudzy.com A

- MX (mail exchanger) records:
  - curl "https://dns.cloudzy.com/dns-json?name=cloudzy.com&type=MX"
  - kdig +https @dns.cloudzy.com cloudzy.com MX

- SPF (TXT):
  - curl "https://dns.cloudzy.com/dns-json?name=cloudzy.com&type=TXT"  # check SPF and other TXT

- DMARC (TXT):
  - curl "https://dns.cloudzy.com/dns-json?name=_dmarc.cloudzy.com&type=TXT"

- DKIM (selector) example:
  - curl "https://dns.cloudzy.com/dns-json?name=default._domainkey.cloudzy.com&type=TXT"
  - (replace `default` with your DKIM selector)

What to look for:
- A record(s) pointing to the actual mail IP(s).
- MX points to a hostname that itself resolves to an IP address (A/AAAA).
- SPF is present and permits your sending hosts.
- DMARC record present for policy/monitoring.
- DKIM public key record exists for your selector(s).

---

## 2) PTR / Reverse DNS (FCrDNS) 🔁
Many receiving MTAs check reverse DNS to help fight spam. For email delivery it's best if the sending IP's PTR record points back to a hostname that resolves to the same IP (Forward-confirmed reverse DNS).

1. Get the mail server IP:

```bash
# Using doh (JSON):
curl -s "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A" | jq
# Or with kdig (wire):
kdig +https @dns.cloudzy.com mail.cloudzy.com A
```

2. Query PTR for that IP (kdig example):

```bash
# Suppose IP is 203.0.113.45
kdig +https @dns.cloudzy.com -x 203.0.113.45
# Or JSON lookup via our DoH endpoint:
curl "https://dns.cloudzy.com/dns-json?name=45.113.0.203.in-addr.arpa&type=PTR"
```

Checks to pass:
- PTR exists and returns a canonical hostname, e.g., `mail.cloudzy.com`.
- The canonical hostname resolves back to the same IP (A/AAAA record).

If these don't match, many MTAs may penalize or reject your mail; fix the PTR where your IP is hosted (hosting provider / IP owner control panel).

---

## 3) Spamhaus / RBL checks 🚫
Real‑time Blackhole Lists (RBLs) like Spamhaus are commonly used to block or flag mail. The typical method is reversing the IP and querying a zone such as `zen.spamhaus.org`.

Example (DoH JSON):

```bash
# Reverse the IP octets and query Spamhaus ZEN using our DoH JSON API (example IP 203.0.113.45):
curl -s "https://dns.cloudzy.com/dns-json?name=45.113.0.203.zen.spamhaus.org&type=A" | jq -r '.Answer[].data // empty'
```

Interpretation:
- If the query returns an A record (e.g., `127.0.0.2`), the IP is listed.
- If the query returns `NXDOMAIN` / empty, the IP is not listed.

Common RBLs to check:
- Spamhaus ZEN: `zen.spamhaus.org`
- Spamhaus SBL/XBL/RHSBL (part of ZEN)
- SpamCop: `bl.spamcop.net`
- SURBL (for message content; checks hostnames in email body)

If listed: follow the RBL operator's delisting procedure — often the listing page provides diagnostics and remediation steps.

---

## 4) SMTP & TLS checks ✉️🔒
This guide focuses on DNS validation via DoH. For SMTP/TLS connectivity and certificate validation, use standard mail and TLS tools externally (e.g., `openssl`, `swaks`, or MTA testing tools) — commands for those checks are intentionally omitted here to keep examples DoH‑centric.
If you need, I can provide a separate SMTP/TLS checklist as a companion document.

---

## 5) Deliverability & spam score checks 🧭
- Check message headers for signs of filtering/drops.
- Send test messages to popular providers (Gmail, Outlook) and inspect rejection notices or delivery delays.
- Use a test spam sender (Mail-Tester, MXToolbox) for scoring.

---

## 6) Recommended anti-spam setup (best practice) ✅
- **PTR/Reverse DNS**: Set PTR to `mail.cloudzy.com` and ensure `mail.cloudzy.com` resolves to that IP.
- **SPF**: Publish an SPF TXT that includes all sending IPs or providers (e.g., `v=spf1 ip4:203.0.113.45 -all`).
- **DKIM**: Sign outbound mail with DKIM; publish public keys under `selector._domainkey.cloudzy.com`.
- **DMARC**: Start with `p=none` to collect reports, later move to `p=quarantine` or `p=reject` as confidence increases.
- **HELO/EHLO**: Use a hostname that matches PTR/forward DNS.
- **TLS**: Enforce TLS for submission and prefer opportunistic TLS for relaying; obtain certificates from a reputable CA.
- **Rate limits & monitoring**: Watch bounce rates, complaint feedback loops, and RBL reports.

---

## 7) Quick checks & scripts you can run locally 🛠️
Here are compact commands that combine checks:

- Basic DNS snapshot (A, MX, TXT):

```bash
curl -s "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
curl -s "https://dns.cloudzy.com/dns-json?name=cloudzy.com&type=MX"
curl -s "https://dns.cloudzy.com/dns-json?name=cloudzy.com&type=TXT"
```

- PTR + forward-confirmation (replace <ip>):

```bash
# PTR
kdig +https @dns.cloudzy.com -x <ip>
# Forward check
kdig +https @dns.cloudzy.com A $(kdig +short -x <ip> | head -n1)
```

- Spamhaus quick test (replace <ip>):

```bash
curl -s "https://dns.cloudzy.com/dns-json?name=$(echo <ip> | awk -F. '{print $4"."$3"."$2"."$1".zen.spamhaus.org"}')&type=A" | jq -r '.Answer[].data // empty'
```

---

## 8) Monitoring & Alerts 📡
- Automate periodic DNS & RBL checks and alert on changes (NXDOMAIN for PTR, new RBL listing).
- Log SMTP rejections and bounce reasons to identify patterns.
- Collect DMARC reports for visibility into who is sending for your domain.

---

## 9) Need help? Support & escalation ✉️
If you suspect our DoH service is returning stale or inconsistent data, report the exact query and timestamps to our team.
For delisting requests from RBL operators, follow each operator's delisting process and provide remediation evidence (fixed open relays, removed malware, corrected SPF/DKIM).

---

## Example cheat-sheet (copy/paste) 📋

```bash
# A record
curl "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A"
# MX record
curl "https://dns.cloudzy.com/dns-json?name=cloudzy.com&type=MX"
# PTR (reverse) — do a DoH forward resolution then reverse-lookup using DoH
kdig +https @dns.cloudzy.com -x $(curl -s "https://dns.cloudzy.com/dns-json?name=mail.cloudzy.com&type=A" | jq -r '.Answer[0].data')
# Spamhaus ZEN test (DoH JSON)
curl -s "https://dns.cloudzy.com/dns-json?name=45.113.0.203.zen.spamhaus.org&type=A" | jq -r '.Answer[].data // empty'
```

---

If you'd like, I can:
- Add small scripts under `scripts/` to automate these checks, or
- Add a one-page PDF quickstart you can share with ops, or
- Add a CI step to periodically run CRON DoH checks and warn on regressions.

Tell me which you'd like and I’ll prepare it (I won’t commit or push unless you confirm).
